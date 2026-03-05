"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { enqueueBunnySync } from "@/lib/queue";
import {
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

function getReturnPath(formData: FormData, fallback: string) {
  const value = getTextValue(formData, "returnPath").trim();
  return value.startsWith("/") ? value : fallback;
}

function getPathValue(formData: FormData, key: string, fallback: string) {
  const value = getTextValue(formData, key).trim();
  return value.startsWith("/") ? value : fallback;
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
  const fallbackPath = getTextValue(formData, "creatorId")
    ? `/dashboard/creator/${getTextValue(formData, "creatorId")}/tiers`
    : "/dashboard/tiers";
  const returnPath = getReturnPath(formData, fallbackPath);

  const parsed = tierCreateSchema.safeParse({
    creatorId: getTextValue(formData, "creatorId"),
    name: getTextValue(formData, "name"),
    description: getTextValue(formData, "description"),
    priceCents: getTextValue(formData, "priceCents"),
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
    status: z.enum(["active", "pending", "disabled"]).optional().default("active"),
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
    status: getTextValue(formData, "status") || "active",
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
    status: parsed.data.status,
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
