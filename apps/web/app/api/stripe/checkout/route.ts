import { NextResponse } from "next/server";

import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validators/schemas";

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

function getSettingNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (value && typeof value === "object" && "value" in value) {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === "number" && Number.isFinite(nested)) {
      return nested;
    }

    if (typeof nested === "string") {
      const parsed = Number(nested);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function normalizeFeePercent(raw: unknown, fallback = 10) {
  const parsed = getSettingNumber(raw, fallback);
  const clamped = Math.min(100, Math.max(0, parsed));
  return Number(clamped.toFixed(2));
}

function vatIncludedSharePercent(vatPercent: number) {
  if (vatPercent <= 0) {
    return 0;
  }

  return Number(((vatPercent / (100 + vatPercent)) * 100).toFixed(2));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request body",
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select(
      "id, creator_id, stripe_price_id, is_active, creators!inner ( slug, stripe_connect_account_id, platform_fee_percent, stripe_connect_charges_enabled )",
    )
    .eq("id", parsed.data.tierId)
    .single();

  if (tierError || !tier) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }

  if (!tier.is_active || !tier.stripe_price_id) {
    return NextResponse.json({ error: "Tier is not purchasable" }, { status: 400 });
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripeClient();

  let stripeCustomerId = existingProfile?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id,
      },
    });

    stripeCustomerId = customer.id;

    if (!existingProfile) {
      await supabase.from("profiles").insert({
        id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    } else {
      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: stripeCustomerId,
        })
        .eq("id", user.id);
    }
  }

  const creatorRelation = tier.creators as
    | {
        slug?: string;
        stripe_connect_account_id?: string | null;
        platform_fee_percent?: number | string | null;
        stripe_connect_charges_enabled?: boolean | null;
      }
    | {
        slug?: string;
        stripe_connect_account_id?: string | null;
        platform_fee_percent?: number | string | null;
        stripe_connect_charges_enabled?: boolean | null;
      }[]
    | null;
  const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
  const creatorSlug = creator?.slug;
  const creatorStripeAccountId = creator?.stripe_connect_account_id;

  if (!creatorStripeAccountId) {
    return NextResponse.json({ error: "Creator is not ready for Stripe Connect payouts yet" }, { status: 400 });
  }

  const { data: settingsRows } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["platform_fee_percent", "vat_percent"]);

  const settings = new Map<string, unknown>((settingsRows ?? []).map((row) => [row.key, row.value]));
  const defaultFeePercent = normalizeFeePercent(settings.get("platform_fee_percent"), 10);
  const creatorFeePercent = normalizeFeePercent(creator?.platform_fee_percent, defaultFeePercent);
  const vatPercent = normalizeFeePercent(settings.get("vat_percent"), 21);
  const vatSharePercent = vatIncludedSharePercent(vatPercent);
  const applicationFeePercent = normalizeFeePercent(creatorFeePercent + vatSharePercent, 10);

  if (!creatorSlug) {
    return NextResponse.json({ error: "Creator slug is missing" }, { status: 400 });
  }

  let canUseOnBehalfOf = Boolean(creator?.stripe_connect_charges_enabled);

  try {
    const account = await stripe.accounts.retrieve(creatorStripeAccountId);
    canUseOnBehalfOf = account.capabilities?.card_payments === "active";
  } catch {
    // Keep DB fallback when live account lookup fails.
  }

  const appUrl = getAppUrl(request);

  let session;

  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: tier.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/c/${creatorSlug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/c/${creatorSlug}?checkout=cancel`,
      metadata: {
        userId: user.id,
        creatorId: tier.creator_id,
        tierId: tier.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          creatorId: tier.creator_id,
          tierId: tier.id,
        },
        invoice_settings: {
          issuer: {
            type: "account",
            account: creatorStripeAccountId,
          },
        },
        application_fee_percent: applicationFeePercent,
        transfer_data: {
          destination: creatorStripeAccountId,
        },
        ...(canUseOnBehalfOf
          ? {
              on_behalf_of: creatorStripeAccountId,
            }
          : {}),
      },
      automatic_tax: {
        enabled: true,
        liability: {
          type: "account",
          account: creatorStripeAccountId,
        },
      },
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      tax_id_collection: {
        enabled: true,
      },
      allow_promotion_codes: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Stripe checkout session";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ url: session.url });
}
