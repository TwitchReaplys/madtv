"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { enqueueBunnySync } from "@/lib/queue";
import {
  creatorSchema,
  postCreateSchema,
  postUpdateSchema,
  tierCreateSchema,
  tierDeleteSchema,
  tierToggleSchema,
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

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

export async function createTierAction(formData: FormData) {
  const parsed = tierCreateSchema.safeParse({
    creatorId: getTextValue(formData, "creatorId"),
    name: getTextValue(formData, "name"),
    description: getTextValue(formData, "description"),
    priceCents: getTextValue(formData, "priceCents"),
    currency: getTextValue(formData, "currency") || "CZK",
    rank: getTextValue(formData, "rank"),
  });

  if (!parsed.success) {
    redirectWithMessage("/dashboard/tiers", "error", parsed.error.issues[0]?.message ?? "Invalid tier form");
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage("/dashboard/tiers", "error", "You are not allowed to manage this creator");
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
    redirectWithMessage("/dashboard/tiers", "error", error.message);
  }

  revalidatePath("/dashboard/tiers");
  revalidatePath("/dashboard");
  redirectWithMessage("/dashboard/tiers", "success", "Tier created");
}

export async function toggleTierAction(formData: FormData) {
  const parsed = tierToggleSchema.safeParse({
    tierId: getTextValue(formData, "tierId"),
    isActive: getTextValue(formData, "isActive"),
  });

  if (!parsed.success) {
    redirectWithMessage("/dashboard/tiers", "error", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("tiers")
    .update({
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.tierId);

  if (error) {
    redirectWithMessage("/dashboard/tiers", "error", error.message);
  }

  revalidatePath("/dashboard/tiers");
  redirectWithMessage("/dashboard/tiers", "success", "Tier updated");
}

export async function deleteTierAction(formData: FormData) {
  const parsed = tierDeleteSchema.safeParse({
    tierId: getTextValue(formData, "tierId"),
  });

  if (!parsed.success) {
    redirectWithMessage("/dashboard/tiers", "error", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const { supabase } = await requireUser();

  const { error } = await supabase.from("tiers").delete().eq("id", parsed.data.tierId);

  if (error) {
    redirectWithMessage("/dashboard/tiers", "error", error.message);
  }

  revalidatePath("/dashboard/tiers");
  redirectWithMessage("/dashboard/tiers", "success", "Tier deleted");
}

export async function createPostAction(formData: FormData) {
  const parsed = postCreateSchema.safeParse({
    creatorId: getTextValue(formData, "creatorId"),
    title: getTextValue(formData, "title"),
    body: getTextValue(formData, "body"),
    visibility: getTextValue(formData, "visibility"),
    minTierRank: getTextValue(formData, "minTierRank"),
    bunnyVideoId: getTextValue(formData, "bunnyVideoId"),
    bunnyLibraryId: getTextValue(formData, "bunnyLibraryId"),
  });

  if (!parsed.success) {
    redirectWithMessage("/dashboard/posts/new", "error", parsed.error.issues[0]?.message ?? "Invalid post form");
  }

  const { supabase, user } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage("/dashboard/posts/new", "error", "You are not allowed to create posts for this creator");
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
    redirectWithMessage("/dashboard/posts/new", "error", postError?.message ?? "Failed to create post");
  }

  if (parsed.data.bunnyVideoId && parsed.data.bunnyLibraryId) {
    const { data: createdAsset, error: assetError } = await supabase
      .from("post_assets")
      .insert({
        post_id: post.id,
        type: "bunny_video",
        bunny_library_id: parsed.data.bunnyLibraryId,
        bunny_video_id: parsed.data.bunnyVideoId,
      })
      .select("id, bunny_video_id, bunny_library_id")
      .single();

    if (assetError) {
      await supabase.from("posts").delete().eq("id", post.id);
      redirectWithMessage("/dashboard/posts/new", "error", assetError.message);
    }

    if (createdAsset?.id && createdAsset.bunny_video_id && createdAsset.bunny_library_id) {
      enqueueBunnySync(createdAsset.id, createdAsset.bunny_video_id, createdAsset.bunny_library_id).catch(() => {
        // Optional background sync should not block post creation.
      });
    }
  }

  const { data: creator } = await supabase.from("creators").select("slug").eq("id", parsed.data.creatorId).single();

  revalidatePath("/dashboard/posts");
  if (creator?.slug) {
    revalidatePath(`/c/${creator.slug}`);
  }

  redirectWithMessage("/dashboard/posts", "success", "Post created");
}

export async function updatePostAction(formData: FormData) {
  const parsed = postUpdateSchema.safeParse({
    id: getTextValue(formData, "id"),
    creatorId: getTextValue(formData, "creatorId"),
    title: getTextValue(formData, "title"),
    body: getTextValue(formData, "body"),
    visibility: getTextValue(formData, "visibility"),
    minTierRank: getTextValue(formData, "minTierRank"),
    bunnyVideoId: getTextValue(formData, "bunnyVideoId"),
    bunnyLibraryId: getTextValue(formData, "bunnyLibraryId"),
    removeVideo: getTextValue(formData, "removeVideo") || "false",
  });

  if (!parsed.success) {
    redirectWithMessage(
      `/dashboard/posts/${getTextValue(formData, "id")}/edit`,
      "error",
      parsed.error.issues[0]?.message ?? "Invalid post form",
    );
  }

  const { supabase } = await requireUser();
  const isAdmin = await isCreatorAdmin(supabase, parsed.data.creatorId);

  if (!isAdmin) {
    redirectWithMessage(`/dashboard/posts/${parsed.data.id}/edit`, "error", "You are not allowed to edit this post");
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
    redirectWithMessage(`/dashboard/posts/${parsed.data.id}/edit`, "error", postError.message);
  }

  if (parsed.data.removeVideo && !parsed.data.bunnyVideoId) {
    const { error: deleteAssetError } = await supabase
      .from("post_assets")
      .delete()
      .eq("post_id", parsed.data.id)
      .eq("type", "bunny_video");

    if (deleteAssetError) {
      redirectWithMessage(`/dashboard/posts/${parsed.data.id}/edit`, "error", deleteAssetError.message);
    }
  }

  if (parsed.data.bunnyVideoId && parsed.data.bunnyLibraryId) {
    const { data: existingAsset } = await supabase
      .from("post_assets")
      .select("id")
      .eq("post_id", parsed.data.id)
      .eq("type", "bunny_video")
      .maybeSingle();

    if (existingAsset) {
      const { data: updatedAsset, error: updateAssetError } = await supabase
        .from("post_assets")
        .update({
          bunny_video_id: parsed.data.bunnyVideoId,
          bunny_library_id: parsed.data.bunnyLibraryId,
        })
        .eq("id", existingAsset.id)
        .select("id, bunny_video_id, bunny_library_id")
        .single();

      if (updateAssetError) {
        redirectWithMessage(`/dashboard/posts/${parsed.data.id}/edit`, "error", updateAssetError.message);
      }

      if (updatedAsset?.id && updatedAsset.bunny_video_id && updatedAsset.bunny_library_id) {
        enqueueBunnySync(updatedAsset.id, updatedAsset.bunny_video_id, updatedAsset.bunny_library_id).catch(() => {
          // Optional background sync should not block post updates.
        });
      }
    } else {
      const { data: createdAsset, error: createAssetError } = await supabase
        .from("post_assets")
        .insert({
          post_id: parsed.data.id,
          type: "bunny_video",
          bunny_video_id: parsed.data.bunnyVideoId,
          bunny_library_id: parsed.data.bunnyLibraryId,
        })
        .select("id, bunny_video_id, bunny_library_id")
        .single();

      if (createAssetError) {
        redirectWithMessage(`/dashboard/posts/${parsed.data.id}/edit`, "error", createAssetError.message);
      }

      if (createdAsset?.id && createdAsset.bunny_video_id && createdAsset.bunny_library_id) {
        enqueueBunnySync(createdAsset.id, createdAsset.bunny_video_id, createdAsset.bunny_library_id).catch(() => {
          // Optional background sync should not block post updates.
        });
      }
    }
  }

  const { data: creator } = await supabase.from("creators").select("slug").eq("id", parsed.data.creatorId).single();

  revalidatePath("/dashboard/posts");
  revalidatePath(`/dashboard/posts/${parsed.data.id}/edit`);

  if (creator?.slug) {
    revalidatePath(`/c/${creator.slug}`);
    revalidatePath(`/c/${creator.slug}/posts/${parsed.data.id}`);
  }

  redirectWithMessage("/dashboard/posts", "success", "Post updated");
}

export async function deletePostAction(formData: FormData) {
  const schema = z.object({
    postId: z.string().uuid(),
  });

  const parsed = schema.safeParse({
    postId: getTextValue(formData, "postId"),
  });

  if (!parsed.success) {
    redirectWithMessage("/dashboard/posts", "error", "Invalid post id");
  }

  const { supabase } = await requireUser();

  const { data: post } = await supabase
    .from("posts")
    .select("id, creator_id")
    .eq("id", parsed.data.postId)
    .single();

  const { error } = await supabase.from("posts").delete().eq("id", parsed.data.postId);

  if (error) {
    redirectWithMessage("/dashboard/posts", "error", error.message);
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

  redirectWithMessage("/dashboard/posts", "success", "Post deleted");
}
