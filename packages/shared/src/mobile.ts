import { z } from "zod";

export const creatorPricingModeSchema = z.enum(["tiers", "single"]);

export const socialLinksSchema = z
  .object({
    instagram: z.string().url().optional(),
    tiktok: z.string().url().optional(),
    youtube: z.string().url().optional(),
    website: z.string().url().optional(),
  })
  .partial();

export const creatorExploreSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().nullable(),
  about: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable(),
  cover_image_url: z.string().url().nullable().optional(),
  accent_color: z.string().nullable(),
  social_links: socialLinksSchema.nullable(),
  seo_description: z.string().nullable().optional(),
  is_featured: z.boolean().nullable().optional(),
  active_members_count: z.number().int().nullable().optional(),
  starting_price_cents: z.number().int().nullable(),
  currency: z.string().nullable(),
  pricing_mode: creatorPricingModeSchema.optional(),
});

export const creatorDetailSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().nullable(),
  about: z.string().nullable(),
  accent_color: z.string().nullable(),
  cover_image_url: z.string().url().nullable(),
  avatar_url: z.string().url().nullable(),
  seo_description: z.string().nullable(),
  social_links: socialLinksSchema.nullable(),
  is_featured: z.boolean().nullable().optional(),
  pricing_mode: creatorPricingModeSchema.optional(),
  single_price_cents: z.number().int().nullable().optional(),
  single_price_currency: z.string().nullable().optional(),
});

export const tierSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  rank: z.number().int().min(1),
  is_active: z.boolean().optional(),
});

export const creatorBundleSchema = z.object({
  creator: creatorDetailSchema,
  tiers: z.array(tierSchema),
  active_rank: z.number().int().nonnegative(),
  is_creator_admin: z.boolean(),
});

export const postVisibilitySchema = z.enum(["public", "members", "tier"]);

export const creatorPostPreviewSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  body_preview: z.string().nullable(),
  visibility: postVisibilitySchema,
  min_tier_rank: z.number().int().nullable(),
  published_at: z.string(),
  has_access: z.boolean(),
  has_video: z.boolean(),
  video_thumbnail_url: z.string().url().nullable().optional(),
});

export const recentPublicPostSchema = creatorPostPreviewSchema.extend({
  creator_slug: z.string().min(1),
  creator_title: z.string().min(1),
  creator_accent_color: z.string().nullable().optional(),
});

export const postAssetSchema = z.object({
  id: z.string().uuid(),
  post_id: z.string().uuid().optional(),
  type: z.enum(["image", "bunny_video"]),
  storage_path: z.string().nullable().optional(),
  bunny_library_id: z.string().nullable().optional(),
  bunny_video_id: z.string().nullable().optional(),
  creator_video_id: z.string().uuid().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().optional(),
});

export const creatorPostDetailSchema = z.object({
  post_id: z.string().uuid(),
  creator_id: z.string().uuid(),
  creator_slug: z.string().min(1),
  creator_title: z.string().min(1),
  creator_avatar_url: z.string().url().nullable().optional(),
  creator_cover_image_url: z.string().url().nullable().optional(),
  accent_color: z.string().nullable(),
  seo_description: z.string().nullable(),
  title: z.string().min(1),
  body: z.string().nullable(),
  body_preview: z.string().nullable(),
  visibility: postVisibilitySchema,
  min_tier_rank: z.number().int().nullable(),
  published_at: z.string(),
  has_access: z.boolean(),
});

export const postDetailBundleSchema = z.object({
  detail: creatorPostDetailSchema,
  tiers: z.array(tierSchema),
  assets: z.array(postAssetSchema),
  active_rank: z.number().int().nonnegative(),
  is_creator_admin: z.boolean(),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  stripe_customer_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  creator_id: z.string().uuid(),
  tier_id: z.string().uuid().nullable(),
  status: z.string(),
  current_period_end: z.string().nullable(),
  provider: z.string(),
  provider_subscription_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const continueWatchingItemSchema = z.object({
  post_id: z.string().uuid(),
  post_title: z.string().min(1),
  creator_slug: z.string().min(1),
  creator_title: z.string().min(1),
  creator_avatar_url: z.string().url().nullable().optional(),
  position_seconds: z.number().int().nonnegative(),
  duration_seconds: z.number().int().nonnegative().nullable(),
  updated_at: z.string(),
  bunny_library_id: z.string().min(1),
  bunny_video_id: z.string().min(1),
  video_thumbnail_url: z.string().url().nullable().optional(),
});

export const playbackTrackInputSchema = z.object({
  postId: z.string().uuid(),
  positionSeconds: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
});

export const videoProgressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  post_id: z.string().uuid(),
  position_seconds: z.number().int().nonnegative(),
  duration_seconds: z.number().int().nonnegative().nullable(),
  updated_at: z.string(),
});

export const queryTextSchema = z.string().trim().max(120);

export type CreatorExplore = z.infer<typeof creatorExploreSchema>;
export type CreatorDetail = z.infer<typeof creatorDetailSchema>;
export type Tier = z.infer<typeof tierSchema>;
export type CreatorBundle = z.infer<typeof creatorBundleSchema>;
export type CreatorPostPreview = z.infer<typeof creatorPostPreviewSchema>;
export type RecentPublicPost = z.infer<typeof recentPublicPostSchema>;
export type PostAsset = z.infer<typeof postAssetSchema>;
export type CreatorPostDetail = z.infer<typeof creatorPostDetailSchema>;
export type PostDetailBundle = z.infer<typeof postDetailBundleSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type ContinueWatchingItem = z.infer<typeof continueWatchingItemSchema>;
export type PlaybackTrackInput = z.infer<typeof playbackTrackInputSchema>;
export type VideoProgress = z.infer<typeof videoProgressSchema>;
