"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { enqueueBunnySync } from "@/lib/queue";
import {
  creatorOnboardingSchema,
  creatorStripeConnectSchema,
  creatorVideoUpsertSchema,
  creatorSchema,
  postCreateSchema,
  postUpdateSchema,
  tierCreateSchema,
  tierDeleteSchema,
  tierToggleSchema,
  viewerProfileSchema,
} from "@/lib/validators/schemas";

function redirectWithMessage(path: string, kind: "error" | "success", message: string): never {
  const params = new URLSearchParams();
  params.set(kind, message);
  return redirect(`${path}?${params.toString()}`);
}

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parsePriceAmountToCents(raw: string) {
  const normalized = raw.trim().replace(/\s+/g, "").replace(",", ".");

  if (!normalized) {
    return null;
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function isSafeAppPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function getReturnPath(formData: FormData, fallback: string) {
  const value = getTextValue(formData, "returnPath").trim();
  return isSafeAppPath(value) ? value : fallback;
}

function getPathValue(formData: FormData, key: string, fallback: string) {
  const value = getTextValue(formData, key).trim();
  return isSafeAppPath(value) ? value : fallback;
}

function buildCreatorSocialLinks(input: {
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  websiteUrl?: string;
}) {
  const socialLinks: Record<string, string> = {};

  if (input.instagramUrl) {
    socialLinks.instagram = input.instagramUrl;
  }

  if (input.tiktokUrl) {
    socialLinks.tiktok = input.tiktokUrl;
  }

  if (input.youtubeUrl) {
    socialLinks.youtube = input.youtubeUrl;
  }

  if (input.websiteUrl) {
    socialLinks.website = input.websiteUrl;
  }

  return socialLinks;
}

function getUserEmailVerifiedAt(user: { email_confirmed_at?: string | null; confirmed_at?: string | null }) {
  return user.email_confirmed_at ?? user.confirmed_at ?? null;
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "";
}

function resolveAppUrl(template: string, creatorId: string) {
  const value = template.includes("{creatorId}")
    ? template.replace("{creatorId}", creatorId)
    : template;

  if (value.startsWith("https://") || value.startsWith("http://")) {
    return value;
  }

  if (isSafeAppPath(value)) {
    const appBaseUrl = getAppBaseUrl();

    if (!appBaseUrl) {
      return null;
    }

    return `${appBaseUrl}${value}`;
  }

  return null;
}

function buildStripeConnectCallbackUrl(creatorId: string, mode: "refresh" | "return") {
  const envKey = mode === "refresh" ? "STRIPE_CONNECT_REFRESH_URL" : "STRIPE_CONNECT_RETURN_URL";
  const envTemplate = process.env[envKey]?.trim();

  if (envTemplate) {
    const resolvedUrl = resolveAppUrl(envTemplate, creatorId);

    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  const appBaseUrl = getAppBaseUrl();
  const fallbackPath = `/dashboard/creator/${creatorId}/onboarding?stripe=${mode}`;

  if (!appBaseUrl) {
    return fallbackPath;
  }

  return `${appBaseUrl}${fallbackPath}`;
}

function deriveOnboardingStatus({
  currentStatus,
  emailVerified,
  stripeConnected,
}: {
  currentStatus: string | null | undefined;
  emailVerified: boolean;
  stripeConnected: boolean;
}) {
  if (currentStatus === "approved" || currentStatus === "rejected") {
    return currentStatus;
  }

  if (stripeConnected) {
    return "stripe_connected";
  }

  if (emailVerified) {
    return "email_verified";
  }

  return "submitted";
}

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

async function isCreatorAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, creatorId: string) {
  const { data, error } = await supabase.rpc("is_creator_admin", {
    p_creator_id: creatorId,
  });

  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function upsertCreatorAction(formData: FormData) {
  const parsed = creatorSchema.safeParse({
    slug: getTextValue(formData, "slug"),
    title: getTextValue(formData, "title"),
    tagline: getTextValue(formData, "tagline"),
    about: getTextValue(formData, "about"),
    accentColor: getTextValue(formData, "accentColor"),
    coverImageUrl: getTextValue(formData, "coverImageUrl"),
    avatarUrl: getTextValue(formData, "avatarUrl"),
    seoDescription: getTextValue(formData, "seoDescription"),
    instagramUrl: getTextValue(formData, "instagramUrl"),
    tiktokUrl: getTextValue(formData, "tiktokUrl"),
    youtubeUrl: getTextValue(formData, "youtubeUrl"),
    websiteUrl: getTextValue(formData, "websiteUrl"),
  });

  if (!parsed.success) {
    redirectWithMessage("/dashboard/creator", "error", parsed.error.issues[0]?.message ?? "Invalid creator form");
  }

  const { supabase, user } = await requireUser();

  const { data: existingCreator } = await supabase
    .from("creators")
    .select("id, slug")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (existingCreator) {
    const { error } = await supabase
      .from("creators")
      .update({
        slug: parsed.data.slug,
        title: parsed.data.title,
        tagline: parsed.data.tagline || null,
        about: parsed.data.about || null,
        accent_color: parsed.data.accentColor || "#16a34a",
        cover_image_url: parsed.data.coverImageUrl || null,
        avatar_url: parsed.data.avatarUrl || null,
        seo_description: parsed.data.seoDescription || null,
        social_links: buildCreatorSocialLinks(parsed.data),
      })
      .eq("id", existingCreator.id);

    if (error) {
      redirectWithMessage("/dashboard/creator", "error", error.message);
    }

    revalidatePath(`/c/${existingCreator.slug}`);
    revalidatePath(`/c/${parsed.data.slug}`);
    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/creator");
    redirectWithMessage("/dashboard/creator", "success", "Creator profile updated");
  }

  const { error } = await supabase.from("creators").insert({
    owner_user_id: user.id,
    slug: parsed.data.slug,
    title: parsed.data.title,
    tagline: parsed.data.tagline || null,
    about: parsed.data.about || null,
    accent_color: parsed.data.accentColor || "#16a34a",
    cover_image_url: parsed.data.coverImageUrl || null,
    avatar_url: parsed.data.avatarUrl || null,
    seo_description: parsed.data.seoDescription || null,
    social_links: buildCreatorSocialLinks(parsed.data),
  });

  if (error) {
    redirectWithMessage("/dashboard/creator", "error", error.message);
  }

  revalidatePath(`/c/${parsed.data.slug}`);
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/creator");
  redirectWithMessage("/dashboard/creator", "success", "Creator profile created");
}

export async function upsertCreatorOnboardingAction(formData: FormData) {
  const creatorIdRaw = getTextValue(formData, "creatorId");
  const defaultReturnPath = creatorIdRaw ? `/dashboard/creator/${creatorIdRaw}/onboarding` : "/dashboard/creator";
  const returnPath = getReturnPath(formData, defaultReturnPath);

  const parsed = creatorOnboardingSchema.safeParse({
    creatorId: creatorIdRaw,
    slug: getTextValue(formData, "slug"),
    title: getTextValue(formData, "title"),
    legalFullName: getTextValue(formData, "legalFullName"),
    legalBusinessId: getTextValue(formData, "legalBusinessId"),
    contactEmail: getTextValue(formData, "contactEmail"),
    contactPhone: getTextValue(formData, "contactPhone"),
    addressLine1: getTextValue(formData, "addressLine1"),
    addressLine2: getTextValue(formData, "addressLine2"),
    addressCity: getTextValue(formData, "addressCity"),
    addressPostalCode: getTextValue(formData, "addressPostalCode"),
    addressCountry: getTextValue(formData, "addressCountry"),
    contentFocus: getTextValue(formData, "contentFocus"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid onboarding form");
  }

  const { supabase, user } = await requireUser();
  const emailVerifiedAt = getUserEmailVerifiedAt(user);
  const normalizedAddressCountry = parsed.data.addressCountry.toUpperCase();
  const submittedAt = new Date().toISOString();

  if (parsed.data.creatorId) {
    const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);
    if (!isAdmin) {
      redirectWithMessage(returnPath, "error", "You are not allowed to update onboarding for this creator");
    }

    const { data: existingCreator, error: existingError } = await supabase
      .from("creators")
      .select(
        "id, slug, onboarding_status, onboarding_email_verified_at, stripe_connect_payouts_enabled, stripe_connect_details_submitted",
      )
      .eq("id", parsed.data.creatorId)
      .single();

    if (existingError || !existingCreator) {
      redirectWithMessage(returnPath, "error", existingError?.message ?? "Creator not found");
    }

    const effectiveEmailVerifiedAt = existingCreator.onboarding_email_verified_at ?? emailVerifiedAt;
    const onboardingStatus = deriveOnboardingStatus({
      currentStatus: existingCreator.onboarding_status,
      emailVerified: Boolean(effectiveEmailVerifiedAt),
      stripeConnected: Boolean(
        existingCreator.stripe_connect_payouts_enabled && existingCreator.stripe_connect_details_submitted,
      ),
    });

    const { error: updateError } = await supabase
      .from("creators")
      .update({
        slug: parsed.data.slug,
        title: parsed.data.title,
        status: "pending",
        legal_full_name: parsed.data.legalFullName,
        legal_business_id: parsed.data.legalBusinessId,
        contact_email: parsed.data.contactEmail,
        contact_phone: parsed.data.contactPhone,
        address_line1: parsed.data.addressLine1,
        address_line2: parsed.data.addressLine2 || null,
        address_city: parsed.data.addressCity,
        address_postal_code: parsed.data.addressPostalCode,
        address_country: normalizedAddressCountry,
        content_focus: parsed.data.contentFocus,
        onboarding_submitted_at: submittedAt,
        onboarding_email_verified_at: effectiveEmailVerifiedAt,
        onboarding_status: onboardingStatus,
      })
      .eq("id", parsed.data.creatorId);

    if (updateError) {
      redirectWithMessage(returnPath, "error", updateError.message);
    }

    revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/onboarding`);
    revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/profile`);
    revalidatePath("/dashboard/creator");
    if (existingCreator.slug) {
      revalidatePath(`/c/${existingCreator.slug}`);
    }

    redirectWithMessage(
      `/dashboard/creator/${parsed.data.creatorId}/onboarding`,
      "success",
      "Onboarding data saved",
    );
  }

  const onboardingStatus = deriveOnboardingStatus({
    currentStatus: "submitted",
    emailVerified: Boolean(emailVerifiedAt),
    stripeConnected: false,
  });

  const { data: createdCreator, error: insertError } = await supabase
    .from("creators")
    .insert({
      owner_user_id: user.id,
      slug: parsed.data.slug,
      title: parsed.data.title,
      status: "pending",
      legal_full_name: parsed.data.legalFullName,
      legal_business_id: parsed.data.legalBusinessId,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone,
      address_line1: parsed.data.addressLine1,
      address_line2: parsed.data.addressLine2 || null,
      address_city: parsed.data.addressCity,
      address_postal_code: parsed.data.addressPostalCode,
      address_country: normalizedAddressCountry,
      content_focus: parsed.data.contentFocus,
      onboarding_submitted_at: submittedAt,
      onboarding_email_verified_at: emailVerifiedAt,
      onboarding_status: onboardingStatus,
    })
    .select("id")
    .single();

  if (insertError || !createdCreator) {
    redirectWithMessage(returnPath, "error", insertError?.message ?? "Failed to create creator onboarding");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/creator");
  revalidatePath("/explore");
  redirectWithMessage(
    `/dashboard/creator/${createdCreator.id}/onboarding`,
    "success",
    "Onboarding profile created",
  );
}

export async function refreshStripeConnectStatusAction(formData: FormData) {
  const parsed = creatorStripeConnectSchema.safeParse({
    creatorId: getTextValue(formData, "creatorId"),
  });

  const creatorIdForPath = typeof formData.get("creatorId") === "string" ? String(formData.get("creatorId")) : "";
  const fallbackPath = creatorIdForPath
    ? `/dashboard/creator/${creatorIdForPath}/onboarding`
    : "/dashboard/creator";
  const returnPath = getReturnPath(formData, fallbackPath);

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid creator id");
  }

  const { supabase, user } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(returnPath, "error", "You are not allowed to refresh Stripe status for this creator");
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id, slug, stripe_connect_account_id, onboarding_status, onboarding_email_verified_at")
    .eq("id", parsed.data.creatorId)
    .single();

  if (creatorError || !creator) {
    redirectWithMessage(returnPath, "error", creatorError?.message ?? "Creator not found");
  }

  if (!creator.stripe_connect_account_id) {
    redirectWithMessage(returnPath, "error", "Stripe Connect account is not linked yet");
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(creator.stripe_connect_account_id);
  const emailVerifiedAt = creator.onboarding_email_verified_at ?? getUserEmailVerifiedAt(user);
  const stripeConnected = Boolean(account.payouts_enabled && account.details_submitted);

  const { error: updateError } = await supabase
    .from("creators")
    .update({
      stripe_connect_charges_enabled: Boolean(account.charges_enabled),
      stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
      stripe_connect_details_submitted: Boolean(account.details_submitted),
      onboarding_email_verified_at: emailVerifiedAt,
      onboarding_status: deriveOnboardingStatus({
        currentStatus: creator.onboarding_status,
        emailVerified: Boolean(emailVerifiedAt),
        stripeConnected,
      }),
    })
    .eq("id", parsed.data.creatorId);

  if (updateError) {
    redirectWithMessage(returnPath, "error", updateError.message);
  }

  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/onboarding`);
  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/settings`);
  if (creator.slug) {
    revalidatePath(`/c/${creator.slug}`);
  }

  redirectWithMessage(returnPath, "success", stripeConnected ? "Stripe Connect is fully connected" : "Stripe status refreshed");
}

export async function startStripeConnectOnboardingAction(formData: FormData) {
  const parsed = creatorStripeConnectSchema.safeParse({
    creatorId: getTextValue(formData, "creatorId"),
  });

  const creatorIdForPath = typeof formData.get("creatorId") === "string" ? String(formData.get("creatorId")) : "";
  const fallbackPath = creatorIdForPath
    ? `/dashboard/creator/${creatorIdForPath}/onboarding`
    : "/dashboard/creator";
  const returnPath = getReturnPath(formData, fallbackPath);

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid creator id");
  }

  const { supabase, user } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(returnPath, "error", "You are not allowed to connect Stripe for this creator");
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select(
      "id, slug, title, onboarding_status, onboarding_email_verified_at, stripe_connect_account_id, contact_email, contact_phone, address_country, legal_full_name, legal_business_id, address_line1, address_city, address_postal_code, content_focus",
    )
    .eq("id", parsed.data.creatorId)
    .single();

  if (creatorError || !creator) {
    redirectWithMessage(returnPath, "error", creatorError?.message ?? "Creator not found");
  }

  if (
    !creator.legal_full_name ||
    !creator.legal_business_id ||
    !creator.contact_email ||
    !creator.contact_phone ||
    !creator.address_line1 ||
    !creator.address_city ||
    !creator.address_postal_code ||
    !creator.address_country ||
    !creator.content_focus
  ) {
    redirectWithMessage(returnPath, "error", "Finish onboarding details before connecting Stripe");
  }

  const emailVerifiedAt = creator.onboarding_email_verified_at ?? getUserEmailVerifiedAt(user);
  const stripe = getStripeClient();
  let stripeConnectAccountId = creator.stripe_connect_account_id;

  try {
    if (!stripeConnectAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: creator.address_country.toUpperCase(),
        email: creator.contact_email,
        capabilities: {
          card_payments: {
            requested: true,
          },
          transfers: {
            requested: true,
          },
        },
        metadata: {
          creatorId: creator.id,
          creatorSlug: creator.slug,
          ownerUserId: user.id,
        },
        business_profile: {
          name: creator.title,
          product_description: creator.content_focus.slice(0, 1000),
        },
      });

      stripeConnectAccountId = account.id;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Stripe Connect account";
    redirectWithMessage(returnPath, "error", message);
  }

  const refreshUrl = buildStripeConnectCallbackUrl(parsed.data.creatorId, "refresh");
  const returnUrl = buildStripeConnectCallbackUrl(parsed.data.creatorId, "return");

  let accountLink;
  try {
    accountLink = await stripe.accountLinks.create({
      account: stripeConnectAccountId,
      type: "account_onboarding",
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Stripe onboarding link";
    redirectWithMessage(returnPath, "error", message);
  }

  const { error: updateError } = await supabase
    .from("creators")
    .update({
      stripe_connect_account_id: stripeConnectAccountId,
      onboarding_email_verified_at: emailVerifiedAt ?? null,
      onboarding_status: creator.onboarding_status === "approved" || creator.onboarding_status === "rejected"
        ? creator.onboarding_status
        : "stripe_pending",
    })
    .eq("id", parsed.data.creatorId);

  if (updateError) {
    redirectWithMessage(returnPath, "error", updateError.message);
  }

  redirect(accountLink.url);
}

export async function openStripeConnectDashboardAction(formData: FormData) {
  const parsed = creatorStripeConnectSchema.safeParse({
    creatorId: getTextValue(formData, "creatorId"),
  });

  const creatorIdForPath = typeof formData.get("creatorId") === "string" ? String(formData.get("creatorId")) : "";
  const fallbackPath = creatorIdForPath
    ? `/dashboard/creator/${creatorIdForPath}/onboarding`
    : "/dashboard/creator";
  const returnPath = getReturnPath(formData, fallbackPath);

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid creator id");
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(returnPath, "error", "You are not allowed to open Stripe dashboard for this creator");
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id, stripe_connect_account_id")
    .eq("id", parsed.data.creatorId)
    .single();

  if (creatorError || !creator) {
    redirectWithMessage(returnPath, "error", creatorError?.message ?? "Creator not found");
  }

  if (!creator.stripe_connect_account_id) {
    redirectWithMessage(returnPath, "error", "Stripe Connect account is not linked yet");
  }

  const stripe = getStripeClient();

  try {
    const loginLink = await stripe.accounts.createLoginLink(creator.stripe_connect_account_id);

    redirect(loginLink.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to open Stripe dashboard";
    redirectWithMessage(returnPath, "error", message);
  }
}

export async function updateCreatorPricingSettingsAction(formData: FormData) {
  const creatorIdRaw = getTextValue(formData, "creatorId");
  const returnPath = getReturnPath(
    formData,
    creatorIdRaw ? `/dashboard/creator/${creatorIdRaw}/settings` : "/dashboard/creator",
  );

  const schema = z.object({
    creatorId: z.string().uuid(),
    pricingMode: z.enum(["tiers", "single"]),
    singlePriceAmount: z.string().optional(),
    singlePriceCurrency: z.string().trim().toUpperCase().length(3).default("CZK"),
  });

  const parsed = schema.safeParse({
    creatorId: creatorIdRaw,
    pricingMode: getTextValue(formData, "pricingMode"),
    singlePriceAmount: getTextValue(formData, "singlePriceAmount"),
    singlePriceCurrency: getTextValue(formData, "singlePriceCurrency") || "CZK",
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid pricing settings");
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(returnPath, "error", "You are not allowed to edit this creator");
  }

  let singlePriceCents: number | null = null;

  if (parsed.data.pricingMode === "single") {
    singlePriceCents = parsePriceAmountToCents(parsed.data.singlePriceAmount ?? "");

    if (!singlePriceCents || singlePriceCents < 100) {
      redirectWithMessage(returnPath, "error", "Jednotná cena musí být ve formátu 199 nebo 199,00.");
    }
  }

  const { error: updateError } = await supabase
    .from("creators")
    .update({
      pricing_mode: parsed.data.pricingMode,
      single_price_cents: singlePriceCents,
      single_price_currency: parsed.data.singlePriceCurrency,
    })
    .eq("id", parsed.data.creatorId);

  if (updateError) {
    redirectWithMessage(returnPath, "error", updateError.message);
  }

  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/settings`);
  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/profile`);
  revalidatePath("/dashboard/creator");
  revalidatePath("/dashboard/tiers");
  revalidatePath("/");
  revalidatePath("/explore");

  const { data: creator } = await supabase
    .from("creators")
    .select("slug")
    .eq("id", parsed.data.creatorId)
    .maybeSingle();

  if (creator?.slug) {
    revalidatePath(`/c/${creator.slug}`);
  }

  redirectWithMessage(returnPath, "success", "Nastavení cen bylo uloženo.");
}

export async function createTierAction(formData: FormData) {
  const fallbackPath = getTextValue(formData, "creatorId")
    ? `/dashboard/creator/${getTextValue(formData, "creatorId")}/tiers`
    : "/dashboard/tiers";
  const returnPath = getReturnPath(formData, fallbackPath);
  const parsedPriceCents = parsePriceAmountToCents(getTextValue(formData, "priceCents"));

  if (!parsedPriceCents || parsedPriceCents < 100) {
    redirectWithMessage(returnPath, "error", "Cena musí být ve formátu 199 nebo 199,00.");
  }

  const parsed = tierCreateSchema.safeParse({
    creatorId: getTextValue(formData, "creatorId"),
    name: getTextValue(formData, "name"),
    description: getTextValue(formData, "description"),
    priceCents: parsedPriceCents,
    currency: getTextValue(formData, "currency") || "CZK",
    rank: getTextValue(formData, "rank"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid tier form");
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(returnPath, "error", "You are not allowed to manage this creator");
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id, title")
    .eq("id", parsed.data.creatorId)
    .single();

  const stripe = getStripeClient();
  const currency = parsed.data.currency.toUpperCase();

  const product = await stripe.products.create({
    name: `${parsed.data.name} - ${creator?.title ?? "Creator"}`,
    description: parsed.data.description || undefined,
    metadata: {
      creatorId: parsed.data.creatorId,
      rank: String(parsed.data.rank),
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: parsed.data.priceCents,
    currency: currency.toLowerCase(),
    tax_behavior: "exclusive",
    recurring: {
      interval: "month",
    },
    metadata: {
      creatorId: parsed.data.creatorId,
      rank: String(parsed.data.rank),
    },
  });

  const { error } = await supabase.from("tiers").insert({
    creator_id: parsed.data.creatorId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    price_cents: parsed.data.priceCents,
    currency,
    rank: parsed.data.rank,
    interval: "month",
    stripe_product_id: product.id,
    stripe_price_id: price.id,
    is_active: true,
  });

  if (error) {
    redirectWithMessage(returnPath, "error", error.message);
  }

  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/tiers`);
  revalidatePath("/dashboard/tiers");
  revalidatePath("/dashboard");
  redirectWithMessage(returnPath, "success", "Tier created");
}

export async function toggleTierAction(formData: FormData) {
  const returnPath = getReturnPath(formData, "/dashboard/tiers");

  const parsed = tierToggleSchema.safeParse({
    tierId: getTextValue(formData, "tierId"),
    isActive: getTextValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("tiers")
    .update({
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.tierId);

  if (error) {
    redirectWithMessage(returnPath, "error", error.message);
  }

  revalidatePath("/dashboard/tiers");
  redirectWithMessage(returnPath, "success", "Tier updated");
}

export async function deleteTierAction(formData: FormData) {
  const returnPath = getReturnPath(formData, "/dashboard/tiers");

  const parsed = tierDeleteSchema.safeParse({
    tierId: getTextValue(formData, "tierId"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const { supabase } = await requireUser();

  const { error } = await supabase.from("tiers").delete().eq("id", parsed.data.tierId);

  if (error) {
    redirectWithMessage(returnPath, "error", error.message);
  }

  revalidatePath("/dashboard/tiers");
  redirectWithMessage(returnPath, "success", "Tier deleted");
}

async function upsertPostVideoAsset(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  postId: string;
  creatorId: string;
  creatorVideoId?: string;
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
}) {
  const { supabase, postId, creatorId } = params;
  let bunnyVideoId = params.bunnyVideoId?.trim() || "";
  const bunnyLibraryId = params.bunnyLibraryId?.trim() || process.env.BUNNY_STREAM_LIBRARY_ID || "";
  let creatorVideoId: string | null = params.creatorVideoId?.trim() || null;

  if (creatorVideoId) {
    const { data: creatorVideo, error: creatorVideoError } = await supabase
      .from("creator_videos")
      .select("id, bunny_video_id")
      .eq("id", creatorVideoId)
      .eq("creator_id", creatorId)
      .single();

    if (creatorVideoError || !creatorVideo) {
      throw new Error(creatorVideoError?.message ?? "Selected creator video not found");
    }

    bunnyVideoId = creatorVideo.bunny_video_id;
  }

  if (!creatorVideoId && bunnyVideoId) {
    const { data: matchedCreatorVideo } = await supabase
      .from("creator_videos")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("bunny_video_id", bunnyVideoId)
      .maybeSingle();

    creatorVideoId = matchedCreatorVideo?.id ?? null;
  }

  if (!bunnyVideoId || !bunnyLibraryId) {
    return null;
  }

  const payload = {
    type: "bunny_video" as const,
    bunny_video_id: bunnyVideoId,
    bunny_library_id: bunnyLibraryId,
    creator_video_id: creatorVideoId,
  };

  const { data: existingAsset } = await supabase
    .from("post_assets")
    .select("id")
    .eq("post_id", postId)
    .eq("type", "bunny_video")
    .maybeSingle();

  if (existingAsset) {
    const { data: updatedAsset, error: updateError } = await supabase
      .from("post_assets")
      .update(payload)
      .eq("id", existingAsset.id)
      .select("id, bunny_video_id, bunny_library_id")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedAsset;
  }

  const { data: createdAsset, error: insertError } = await supabase
    .from("post_assets")
    .insert({
      post_id: postId,
      ...payload,
    })
    .select("id, bunny_video_id, bunny_library_id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return createdAsset;
}

export async function createPostAction(formData: FormData) {
  const creatorIdRaw = getTextValue(formData, "creatorId");
  const errorPath = getReturnPath(
    formData,
    creatorIdRaw ? `/dashboard/creator/${creatorIdRaw}/posts/new` : "/dashboard/posts/new",
  );
  const successPath = getPathValue(
    formData,
    "successPath",
    creatorIdRaw ? `/dashboard/creator/${creatorIdRaw}/posts` : "/dashboard/posts",
  );

  const parsed = postCreateSchema.safeParse({
    creatorId: creatorIdRaw,
    title: getTextValue(formData, "title"),
    body: getTextValue(formData, "body"),
    visibility: getTextValue(formData, "visibility"),
    minTierRank: getTextValue(formData, "minTierRank"),
    creatorVideoId: getTextValue(formData, "creatorVideoId"),
    bunnyVideoId: getTextValue(formData, "bunnyVideoId"),
    bunnyLibraryId: getTextValue(formData, "bunnyLibraryId"),
  });

  if (!parsed.success) {
    redirectWithMessage(errorPath, "error", parsed.error.issues[0]?.message ?? "Invalid post form");
  }

  const { supabase, user } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(errorPath, "error", "You are not allowed to create posts for this creator");
  }

  const postPayload = {
    creator_id: parsed.data.creatorId,
    author_user_id: user.id,
    title: parsed.data.title,
    body: parsed.data.body || null,
    visibility: parsed.data.visibility,
    min_tier_rank: parsed.data.visibility === "tier" ? parsed.data.minTierRank ?? null : null,
  };

  const { data: post, error: postError } = await supabase.from("posts").insert(postPayload).select("id, creator_id").single();

  if (postError || !post) {
    redirectWithMessage(errorPath, "error", postError?.message ?? "Failed to create post");
  }

  try {
    const createdAsset = await upsertPostVideoAsset({
      supabase,
      postId: post.id,
      creatorId: parsed.data.creatorId,
      creatorVideoId: parsed.data.creatorVideoId || undefined,
      bunnyVideoId: parsed.data.bunnyVideoId || undefined,
      bunnyLibraryId: parsed.data.bunnyLibraryId || undefined,
    });

    if (createdAsset?.id && createdAsset.bunny_video_id && createdAsset.bunny_library_id) {
      enqueueBunnySync(createdAsset.id, createdAsset.bunny_video_id, createdAsset.bunny_library_id).catch(() => {
        // Optional background sync should not block post creation.
      });
    }
  } catch (error) {
    await supabase.from("posts").delete().eq("id", post.id);
    redirectWithMessage(
      errorPath,
      "error",
      error instanceof Error ? error.message : "Failed to attach video asset",
    );
  }

  const { data: creator } = await supabase.from("creators").select("slug").eq("id", parsed.data.creatorId).single();

  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/posts`);
  revalidatePath("/dashboard/posts");
  if (creator?.slug) {
    revalidatePath(`/c/${creator.slug}`);
  }

  redirectWithMessage(successPath, "success", "Post created");
}

export async function updatePostAction(formData: FormData) {
  const creatorIdRaw = getTextValue(formData, "creatorId");
  const postIdRaw = getTextValue(formData, "id");
  const errorPath = getReturnPath(
    formData,
    creatorIdRaw
      ? `/dashboard/creator/${creatorIdRaw}/posts/${postIdRaw}/edit`
      : `/dashboard/posts/${postIdRaw}/edit`,
  );
  const successPath = getPathValue(
    formData,
    "successPath",
    creatorIdRaw ? `/dashboard/creator/${creatorIdRaw}/posts` : "/dashboard/posts",
  );

  const parsed = postUpdateSchema.safeParse({
    id: postIdRaw,
    creatorId: creatorIdRaw,
    title: getTextValue(formData, "title"),
    body: getTextValue(formData, "body"),
    visibility: getTextValue(formData, "visibility"),
    minTierRank: getTextValue(formData, "minTierRank"),
    creatorVideoId: getTextValue(formData, "creatorVideoId"),
    bunnyVideoId: getTextValue(formData, "bunnyVideoId"),
    bunnyLibraryId: getTextValue(formData, "bunnyLibraryId"),
    removeVideo: getTextValue(formData, "removeVideo") || "false",
  });

  if (!parsed.success) {
    redirectWithMessage(errorPath, "error", parsed.error.issues[0]?.message ?? "Invalid post form");
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(errorPath, "error", "You are not allowed to edit this post");
  }

  const { error: postError } = await supabase
    .from("posts")
    .update({
      title: parsed.data.title,
      body: parsed.data.body || null,
      visibility: parsed.data.visibility,
      min_tier_rank: parsed.data.visibility === "tier" ? parsed.data.minTierRank ?? null : null,
    })
    .eq("id", parsed.data.id)
    .eq("creator_id", parsed.data.creatorId);

  if (postError) {
    redirectWithMessage(errorPath, "error", postError.message);
  }

  if (
    parsed.data.removeVideo &&
    !parsed.data.creatorVideoId &&
    !parsed.data.bunnyVideoId
  ) {
    const { error: deleteAssetError } = await supabase
      .from("post_assets")
      .delete()
      .eq("post_id", parsed.data.id)
      .eq("type", "bunny_video");

    if (deleteAssetError) {
      redirectWithMessage(errorPath, "error", deleteAssetError.message);
    }
  }

  if (parsed.data.creatorVideoId || (parsed.data.bunnyVideoId && parsed.data.bunnyLibraryId)) {
    try {
      const asset = await upsertPostVideoAsset({
        supabase,
        postId: parsed.data.id,
        creatorId: parsed.data.creatorId,
        creatorVideoId: parsed.data.creatorVideoId || undefined,
        bunnyVideoId: parsed.data.bunnyVideoId || undefined,
        bunnyLibraryId: parsed.data.bunnyLibraryId || undefined,
      });

      if (asset?.id && asset.bunny_video_id && asset.bunny_library_id) {
        enqueueBunnySync(asset.id, asset.bunny_video_id, asset.bunny_library_id).catch(() => {
          // Optional background sync should not block post updates.
        });
      }
    } catch (error) {
      redirectWithMessage(
        errorPath,
        "error",
        error instanceof Error ? error.message : "Failed to attach video asset",
      );
    }
  }

  const { data: creator } = await supabase.from("creators").select("slug").eq("id", parsed.data.creatorId).single();

  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/posts`);
  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/posts/${parsed.data.id}/edit`);
  revalidatePath("/dashboard/posts");
  revalidatePath(`/dashboard/posts/${parsed.data.id}/edit`);

  if (creator?.slug) {
    revalidatePath(`/c/${creator.slug}`);
    revalidatePath(`/c/${creator.slug}/posts/${parsed.data.id}`);
  }

  redirectWithMessage(successPath, "success", "Post updated");
}

export async function deletePostAction(formData: FormData) {
  const returnPath = getReturnPath(formData, "/dashboard/posts");

  const schema = z.object({
    postId: z.string().uuid(),
  });

  const parsed = schema.safeParse({
    postId: getTextValue(formData, "postId"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", "Invalid post id");
  }

  const { supabase } = await requireUser();

  const { data: post } = await supabase
    .from("posts")
    .select("id, creator_id")
    .eq("id", parsed.data.postId)
    .single();

  const { error } = await supabase.from("posts").delete().eq("id", parsed.data.postId);

  if (error) {
    redirectWithMessage(returnPath, "error", error.message);
  }

  if (post?.creator_id) {
    revalidatePath(`/dashboard/creator/${post.creator_id}/posts`);
  }
  revalidatePath("/dashboard/posts");

  let slug: string | null = null;

  if (post?.creator_id) {
    const { data: creator } = await supabase
      .from("creators")
      .select("slug")
      .eq("id", post.creator_id)
      .maybeSingle();

    slug = creator?.slug ?? null;
  }

  if (slug) {
    revalidatePath(`/c/${slug}`);
  }

  redirectWithMessage(returnPath, "success", "Post deleted");
}

export async function updateViewerProfileAction(formData: FormData) {
  const returnPath = getReturnPath(formData, "/dashboard/viewer/profile");

  const parsed = viewerProfileSchema.safeParse({
    username: getTextValue(formData, "username"),
    displayName: getTextValue(formData, "displayName"),
    avatarUrl: getTextValue(formData, "avatarUrl"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid profile payload");
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username || null,
      display_name: parsed.data.displayName || null,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) {
    redirectWithMessage(returnPath, "error", error.message);
  }

  revalidatePath("/dashboard/viewer");
  revalidatePath("/dashboard/viewer/profile");
  redirectWithMessage(returnPath, "success", "Profile updated");
}

export async function upsertCreatorVideoAction(formData: FormData) {
  const creatorIdRaw = getTextValue(formData, "creatorId");
  const returnPath = getReturnPath(
    formData,
    creatorIdRaw ? `/dashboard/creator/${creatorIdRaw}/videos` : "/dashboard/creator",
  );

  const parsed = creatorVideoUpsertSchema.safeParse({
    creatorId: creatorIdRaw,
    title: getTextValue(formData, "title"),
    bunnyVideoId: getTextValue(formData, "bunnyVideoId"),
    bunnyLibraryId: getTextValue(formData, "bunnyLibraryId"),
    thumbnailUrl: getTextValue(formData, "thumbnailUrl"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid video payload");
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(returnPath, "error", "You are not allowed to manage this creator videos");
  }

  const { error } = await supabase.from("creator_videos").upsert(
    {
      creator_id: parsed.data.creatorId,
      title: parsed.data.title,
      bunny_video_id: parsed.data.bunnyVideoId,
      status: "ready",
      thumbnail_url: parsed.data.thumbnailUrl || null,
      meta: {
        bunny_library_id: parsed.data.bunnyLibraryId,
      },
    },
    {
      onConflict: "bunny_video_id",
    },
  );

  if (error) {
    redirectWithMessage(returnPath, "error", error.message);
  }

  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/videos`);
  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/profile`);
  redirectWithMessage(returnPath, "success", "Creator video saved");
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function updateCreatorProfileByIdAction(formData: FormData) {
  const creatorIdRaw = getTextValue(formData, "creatorId");
  const returnPath = getReturnPath(
    formData,
    creatorIdRaw ? `/dashboard/creator/${creatorIdRaw}/profile` : "/dashboard/creator",
  );

  const schema = creatorSchema.extend({
    creatorId: z.string().uuid(),
  });

  const parsed = schema.safeParse({
    creatorId: creatorIdRaw,
    slug: getTextValue(formData, "slug"),
    title: getTextValue(formData, "title"),
    tagline: getTextValue(formData, "tagline"),
    about: getTextValue(formData, "about"),
    accentColor: getTextValue(formData, "accentColor"),
    coverImageUrl: getTextValue(formData, "coverImageUrl"),
    avatarUrl: getTextValue(formData, "avatarUrl"),
    seoDescription: getTextValue(formData, "seoDescription"),
    instagramUrl: getTextValue(formData, "instagramUrl"),
    tiktokUrl: getTextValue(formData, "tiktokUrl"),
    youtubeUrl: getTextValue(formData, "youtubeUrl"),
    websiteUrl: getTextValue(formData, "websiteUrl"),
    featuredMediaType: getTextValue(formData, "featuredMediaType"),
    featuredVideoId: getTextValue(formData, "featuredVideoId"),
    featuredThumbnailUrl: getTextValue(formData, "featuredThumbnailUrl"),
    featuredImageUrl: getTextValue(formData, "featuredImageUrl"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Invalid creator payload");
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(returnPath, "error", "You are not allowed to edit this creator");
  }

  let featuredThumbnailUrl = parsed.data.featuredThumbnailUrl || null;
  let featuredImageUrl = parsed.data.featuredImageUrl || null;
  const thumbnailFile = formData.get("featuredThumbnailFile");
  const featuredImageFile = formData.get("featuredImageFile");

  if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
    const adminSupabase = createAdminSupabaseClient();
    const extension = thumbnailFile.name.includes(".") ? thumbnailFile.name.split(".").pop() : "jpg";
    const baseName = sanitizeFilename((thumbnailFile.name || "thumb").replace(/\.[^/.]+$/, ""));
    const filePath = `${parsed.data.creatorId}/featured-thumbnail-${Date.now()}-${baseName}.${extension}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("creator-media")
      .upload(filePath, thumbnailFile, {
        upsert: true,
        contentType: thumbnailFile.type || undefined,
      });

    if (uploadError) {
      redirectWithMessage(returnPath, "error", `Thumbnail upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = adminSupabase.storage.from("creator-media").getPublicUrl(filePath);
    featuredThumbnailUrl = publicUrlData.publicUrl;
  }

  if (featuredImageFile instanceof File && featuredImageFile.size > 0) {
    const adminSupabase = createAdminSupabaseClient();
    const extension = featuredImageFile.name.includes(".") ? featuredImageFile.name.split(".").pop() : "jpg";
    const baseName = sanitizeFilename((featuredImageFile.name || "featured").replace(/\.[^/.]+$/, ""));
    const filePath = `${parsed.data.creatorId}/featured-image-${Date.now()}-${baseName}.${extension}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("creator-media")
      .upload(filePath, featuredImageFile, {
        upsert: true,
        contentType: featuredImageFile.type || undefined,
      });

    if (uploadError) {
      redirectWithMessage(returnPath, "error", `Featured image upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = adminSupabase.storage.from("creator-media").getPublicUrl(filePath);
    featuredImageUrl = publicUrlData.publicUrl;
  }

  const updatePayload = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    tagline: parsed.data.tagline || null,
    about: parsed.data.about || null,
    accent_color: parsed.data.accentColor || "#7c3aed",
    cover_image_url: parsed.data.coverImageUrl || null,
    avatar_url: parsed.data.avatarUrl || null,
    seo_description: parsed.data.seoDescription || null,
    social_links: buildCreatorSocialLinks(parsed.data),
    featured_media_type: parsed.data.featuredMediaType || "none",
    featured_video_id:
      parsed.data.featuredMediaType === "bunny_video" ? parsed.data.featuredVideoId || null : null,
    featured_thumbnail_url:
      parsed.data.featuredMediaType === "bunny_video" ? featuredThumbnailUrl : null,
    featured_image_url:
      parsed.data.featuredMediaType === "image" ? featuredImageUrl : null,
  };

  if (updatePayload.featured_media_type === "bunny_video" && updatePayload.featured_video_id) {
    const { data: featuredVideo } = await supabase
      .from("creator_videos")
      .select("id")
      .eq("creator_id", parsed.data.creatorId)
      .eq("bunny_video_id", updatePayload.featured_video_id)
      .maybeSingle();

    if (!featuredVideo) {
      redirectWithMessage(returnPath, "error", "Selected featured video is not in creator library");
    }
  }

  const { error: updateError } = await supabase
    .from("creators")
    .update(updatePayload)
    .eq("id", parsed.data.creatorId);

  if (updateError) {
    redirectWithMessage(returnPath, "error", updateError.message);
  }

  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/profile`);
  revalidatePath(`/dashboard/creator/${parsed.data.creatorId}/settings`);
  revalidatePath("/dashboard/creator");
  revalidatePath("/");
  revalidatePath("/explore");

  const { data: creator } = await supabase
    .from("creators")
    .select("slug")
    .eq("id", parsed.data.creatorId)
    .maybeSingle();

  if (creator?.slug) {
    revalidatePath(`/c/${creator.slug}`);
  }

  redirectWithMessage(returnPath, "success", "Creator profile updated");
}
