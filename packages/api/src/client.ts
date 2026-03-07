import {
  continueWatchingItemSchema,
  creatorBundleSchema,
  creatorDetailSchema,
  creatorExploreSchema,
  creatorPostPreviewSchema,
  playbackTrackInputSchema,
  postAssetSchema,
  postDetailBundleSchema,
  profileSchema,
  queryTextSchema,
  recentPublicPostSchema,
  subscriptionSchema,
  tierSchema,
  videoProgressSchema,
  type ContinueWatchingItem,
  type CreatorBundle,
  type CreatorExplore,
  type CreatorPostPreview,
  type PlaybackTrackInput,
  type PostDetailBundle,
  type Profile,
  type RecentPublicPost,
  type Subscription,
  type VideoProgress,
} from "@madtv/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiClientError } from "./errors";

type SupabaseAnyClient = SupabaseClient<any, "public", any>;

type CreatorSource = {
  creatorId?: string;
  creatorSlug?: string;
};

type GetFeaturedCreatorsOptions = {
  limit?: number;
};

type SearchCreatorsOptions = {
  limit?: number;
};

type GetRecentPublicPostsOptions = {
  limit?: number;
};

type GetCreatorPostsOptions = CreatorSource & {
  limit?: number;
};

type GetPostByIdOptions = {
  creatorSlug?: string;
};

type GetContinueWatchingOptions = {
  limit?: number;
};

type PlatformApiOptions = {
  supabase: SupabaseAnyClient;
};

type CreatorPostDetailPreviewRow = {
  post_id: string;
  creator_id: string;
  creator_slug: string;
  creator_title: string;
  creator_avatar_url?: string | null;
  creator_cover_image_url?: string | null;
  accent_color: string | null;
  seo_description: string | null;
  title: string;
  body: string | null;
  body_preview: string | null;
  visibility: "public" | "members" | "tier";
  min_tier_rank: number | null;
  published_at: string;
  has_access: boolean;
};

const creatorExploreSelect =
  "id, slug, title, tagline, about, avatar_url, cover_image_url, accent_color, social_links, seo_description, is_featured, active_members_count, starting_price_cents, currency, pricing_mode";

const creatorDetailSelect =
  "id, slug, title, tagline, about, accent_color, cover_image_url, avatar_url, seo_description, social_links, is_featured, pricing_mode, single_price_cents, single_price_currency";

const tierSelect = "id, creator_id, name, description, price_cents, currency, rank, is_active";

const creatorPostPreviewSelect =
  "id, title, body_preview, visibility, min_tier_rank, published_at, has_access, has_video, video_thumbnail_url";

const postAssetSelect =
  "id, post_id, type, storage_path, bunny_library_id, bunny_video_id, creator_video_id, meta, created_at";

const profileSelect = "id, username, display_name, avatar_url, stripe_customer_id, created_at";

const subscriptionSelect =
  "id, user_id, creator_id, tier_id, status, current_period_end, provider, provider_subscription_id, created_at, updated_at";

const videoProgressSelect = "id, user_id, post_id, position_seconds, duration_seconds, updated_at";

function throwApiError(error: { message: string; code?: string | null }) {
  throw new ApiClientError(error.message, error.code ?? null);
}

function normalizeLimit(limit: number | undefined, fallback: number, max: number) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return fallback;
  }

  return Math.min(max, Math.max(1, Math.floor(limit)));
}

function sanitizeSearchTerm(query: string) {
  return query
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function looksLikeMissingTableError(message: string, tableName: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("does not exist") && normalized.includes(tableName.toLowerCase());
}

function resolveAssetThumbnail(asset: { meta?: Record<string, unknown> | null }) {
  const thumbnailFromMeta = asset.meta?.thumbnail_url;
  if (typeof thumbnailFromMeta === "string" && thumbnailFromMeta.trim().length > 0) {
    return thumbnailFromMeta;
  }

  const bunnyMeta = asset.meta?.bunny;
  if (bunnyMeta && typeof bunnyMeta === "object" && !Array.isArray(bunnyMeta)) {
    const fileName = (bunnyMeta as Record<string, unknown>).thumbnailFileName;
    if (typeof fileName === "string" && fileName.trim().length > 0) {
      return fileName;
    }
  }

  return null;
}

async function resolveCreatorId(supabase: SupabaseAnyClient, source: CreatorSource) {
  if (source.creatorId) {
    return source.creatorId;
  }

  if (!source.creatorSlug) {
    return null;
  }

  const { data, error } = await supabase
    .from("creators")
    .select("id")
    .eq("slug", source.creatorSlug)
    .maybeSingle();

  if (error) {
    throwApiError(error);
  }

  return data?.id ?? null;
}

async function getViewerMembershipState(supabase: SupabaseAnyClient, creatorId: string) {
  const [{ data: rank }, { data: isCreatorAdmin }] = await Promise.all([
    supabase.rpc("active_subscription_rank", {
      p_creator_id: creatorId,
    }),
    supabase.rpc("is_creator_admin", {
      p_creator_id: creatorId,
    }),
  ]);

  return {
    activeRank: Number(rank ?? 0),
    isCreatorAdmin: Boolean(isCreatorAdmin),
  };
}

export function createPlatformApi({ supabase }: PlatformApiOptions) {
  async function getFeaturedCreators(options: GetFeaturedCreatorsOptions = {}): Promise<CreatorExplore[]> {
    const limit = normalizeLimit(options.limit, 12, 40);

    const { data, error } = await supabase
      .from("creator_explore")
      .select(creatorExploreSelect)
      .order("is_featured", { ascending: false })
      .order("active_members_count", { ascending: false })
      .order("title", { ascending: true })
      .limit(limit);

    if (error) {
      throwApiError(error);
    }

    return creatorExploreSchema.array().parse(data ?? []);
  }

  async function searchCreators(query: string, options: SearchCreatorsOptions = {}): Promise<CreatorExplore[]> {
    const normalizedQuery = sanitizeSearchTerm(queryTextSchema.parse(query));
    const limit = normalizeLimit(options.limit, 24, 60);

    if (!normalizedQuery) {
      return getFeaturedCreators({ limit });
    }

    const ilike = `%${normalizedQuery}%`;

    const { data, error } = await supabase
      .from("creator_explore")
      .select(creatorExploreSelect)
      .or(`title.ilike.${ilike},tagline.ilike.${ilike},about.ilike.${ilike},slug.ilike.${ilike}`)
      .order("is_featured", { ascending: false })
      .order("active_members_count", { ascending: false })
      .order("title", { ascending: true })
      .limit(limit);

    if (error) {
      throwApiError(error);
    }

    return creatorExploreSchema.array().parse(data ?? []);
  }

  async function getCreatorBySlug(slug: string): Promise<CreatorBundle | null> {
    const { data, error } = await supabase
      .from("creators")
      .select(creatorDetailSelect)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throwApiError(error);
    }

    if (!data) {
      return null;
    }

    const creator = creatorDetailSchema.parse(data);

    const [{ data: tiersData, error: tiersError }, membershipState] = await Promise.all([
      supabase
        .from("tiers")
        .select(tierSelect)
        .eq("creator_id", creator.id)
        .eq("is_active", true)
        .order("rank", { ascending: true }),
      getViewerMembershipState(supabase, creator.id),
    ]);

    if (tiersError) {
      throwApiError(tiersError);
    }

    return creatorBundleSchema.parse({
      creator,
      tiers: tierSchema.array().parse(tiersData ?? []),
      active_rank: membershipState.activeRank,
      is_creator_admin: membershipState.isCreatorAdmin,
    });
  }

  async function getCreatorPosts(options: GetCreatorPostsOptions): Promise<CreatorPostPreview[]> {
    const creatorId = await resolveCreatorId(supabase, options);

    if (!creatorId) {
      return [];
    }

    const { data, error } = await supabase.rpc("creator_post_previews", {
      p_creator_id: creatorId,
    });

    if (error) {
      throwApiError(error);
    }

    const rows = creatorPostPreviewSchema.array().parse(data ?? []);
    const limit = normalizeLimit(options.limit, rows.length || 30, 100);

    return rows.slice(0, limit);
  }

  async function getRecentPublicPosts(options: GetRecentPublicPostsOptions = {}): Promise<RecentPublicPost[]> {
    const limit = normalizeLimit(options.limit, 10, 40);

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, body, visibility, min_tier_rank, published_at, creators!inner(slug, title, accent_color), post_assets(type, meta)",
      )
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      throwApiError(error);
    }

    const rows = (data ?? []).map((row) => {
      const creatorRelation = row.creators as
        | {
            slug?: string | null;
            title?: string | null;
            accent_color?: string | null;
          }
        | {
            slug?: string | null;
            title?: string | null;
            accent_color?: string | null;
          }[]
        | null;

      const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
      const assets = Array.isArray(row.post_assets) ? row.post_assets : [];
      const firstVideoAsset = assets.find((asset) => asset && asset.type === "bunny_video");
      const bodyPreview = typeof row.body === "string" ? row.body.slice(0, 220) : null;

      return recentPublicPostSchema.parse({
        id: row.id,
        title: row.title,
        body_preview: bodyPreview,
        visibility: row.visibility,
        min_tier_rank: row.min_tier_rank,
        published_at: row.published_at,
        has_access: true,
        has_video: Boolean(firstVideoAsset),
        video_thumbnail_url: firstVideoAsset ? resolveAssetThumbnail(firstVideoAsset) : null,
        creator_slug: creator?.slug ?? "creator",
        creator_title: creator?.title ?? "Creator",
        creator_accent_color: creator?.accent_color ?? null,
      });
    });

    return rows;
  }

  async function getPostById(id: string, options: GetPostByIdOptions = {}): Promise<PostDetailBundle | null> {
    const postId = id.trim();
    if (!postId) {
      return null;
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc("mobile_post_detail_preview", {
      p_post_id: postId,
      p_creator_slug_hint: options.creatorSlug ?? null,
    });

    if (rpcError) {
      throwApiError(rpcError);
    }

    const detailRow = (rpcData as CreatorPostDetailPreviewRow[] | null)?.[0] ?? null;
    if (!detailRow) {
      return null;
    }

    const detail = {
      post_id: detailRow.post_id,
      creator_id: detailRow.creator_id,
      creator_slug: detailRow.creator_slug,
      creator_title: detailRow.creator_title,
      creator_avatar_url: detailRow.creator_avatar_url ?? null,
      creator_cover_image_url: detailRow.creator_cover_image_url ?? null,
      accent_color: detailRow.accent_color ?? null,
      seo_description: detailRow.seo_description ?? null,
      title: detailRow.title,
      body: detailRow.body,
      body_preview: detailRow.body_preview,
      visibility: detailRow.visibility,
      min_tier_rank: detailRow.min_tier_rank,
      published_at: detailRow.published_at,
      has_access: detailRow.has_access,
    };

    const [{ data: tiersData, error: tiersError }, membershipState] = await Promise.all([
      supabase
        .from("tiers")
        .select(tierSelect)
        .eq("creator_id", detail.creator_id)
        .eq("is_active", true)
        .order("rank", { ascending: true }),
      getViewerMembershipState(supabase, detail.creator_id),
    ]);

    if (tiersError) {
      throwApiError(tiersError);
    }

    let assets: unknown[] = [];

    if (detail.has_access) {
      const { data: assetRows, error: assetsError } = await supabase
        .from("post_assets")
        .select(postAssetSelect)
        .eq("post_id", detail.post_id)
        .order("created_at", { ascending: true });

      if (assetsError) {
        throwApiError(assetsError);
      }

      assets = assetRows ?? [];
    }

    return postDetailBundleSchema.parse({
      detail,
      tiers: tierSchema.array().parse(tiersData ?? []),
      assets: postAssetSchema.array().parse(assets),
      active_rank: membershipState.activeRank,
      is_creator_admin: membershipState.isCreatorAdmin,
    });
  }

  async function getCurrentProfile(): Promise<Profile | null> {
    const { data, error } = await supabase.from("profiles").select(profileSelect).maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }

      throwApiError(error);
    }

    return data ? profileSchema.parse(data) : null;
  }

  async function getCurrentSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(subscriptionSelect)
      .order("created_at", { ascending: false });

    if (error) {
      throwApiError(error);
    }

    return subscriptionSchema.array().parse(data ?? []);
  }

  async function trackPlaybackProgress(input: PlaybackTrackInput): Promise<VideoProgress | null> {
    const parsed = playbackTrackInputSchema.parse(input);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throwApiError(userError);
    }

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("video_progress")
      .upsert(
        {
          user_id: user.id,
          post_id: parsed.postId,
          position_seconds: parsed.positionSeconds,
          duration_seconds: parsed.durationSeconds ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,post_id",
          ignoreDuplicates: false,
        },
      )
      .select(videoProgressSelect)
      .single();

    if (error) {
      if (looksLikeMissingTableError(error.message, "video_progress")) {
        return null;
      }

      throwApiError(error);
    }

    return videoProgressSchema.parse(data);
  }

  async function getContinueWatching(options: GetContinueWatchingOptions = {}): Promise<ContinueWatchingItem[]> {
    const limit = normalizeLimit(options.limit, 12, 30);

    const { data, error } = await supabase
      .from("video_progress")
      .select("post_id, position_seconds, duration_seconds, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (looksLikeMissingTableError(error.message, "video_progress")) {
        return [];
      }

      throwApiError(error);
    }

    const progressRows = (data ?? []).filter((row) => row.position_seconds > 0);
    if (progressRows.length === 0) {
      return [];
    }

    const items = await Promise.all(
      progressRows.map(async (row) => {
        const postBundle = await getPostById(row.post_id);
        if (!postBundle?.detail.has_access) {
          return null;
        }

        const firstVideo = postBundle.assets.find((asset) => asset.type === "bunny_video");
        if (!firstVideo?.bunny_library_id || !firstVideo.bunny_video_id) {
          return null;
        }

        return continueWatchingItemSchema.parse({
          post_id: postBundle.detail.post_id,
          post_title: postBundle.detail.title,
          creator_slug: postBundle.detail.creator_slug,
          creator_title: postBundle.detail.creator_title,
          creator_avatar_url: postBundle.detail.creator_avatar_url ?? null,
          position_seconds: row.position_seconds,
          duration_seconds: row.duration_seconds ?? null,
          updated_at: row.updated_at,
          bunny_library_id: firstVideo.bunny_library_id,
          bunny_video_id: firstVideo.bunny_video_id,
          video_thumbnail_url: resolveAssetThumbnail(firstVideo),
        });
      }),
    );

    return items.filter((item): item is ContinueWatchingItem => item !== null);
  }

  return {
    getFeaturedCreators,
    searchCreators,
    getCreatorBySlug,
    getCreatorPosts,
    getRecentPublicPosts,
    getPostById,
    getCurrentProfile,
    getCurrentSubscriptions,
    getContinueWatching,
    trackPlaybackProgress,
  };
}

export type PlatformApiClient = ReturnType<typeof createPlatformApi>;
export type {
  GetContinueWatchingOptions,
  GetCreatorPostsOptions,
  GetFeaturedCreatorsOptions,
  GetPostByIdOptions,
  GetRecentPublicPostsOptions,
  PlatformApiOptions,
  SearchCreatorsOptions,
};
