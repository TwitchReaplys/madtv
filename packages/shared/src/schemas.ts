import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

export const creatorSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(slugRegex, "Slug must be lowercase letters, numbers and hyphens"),
  title: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(180).optional().or(z.literal("")),
  about: z.string().trim().max(5000).optional().or(z.literal("")),
  accentColor: z
    .string()
    .trim()
    .regex(hexColorRegex, "Accent color must be a valid hex color")
    .optional()
    .or(z.literal("")),
  coverImageUrl: z.string().url().max(1000).optional().or(z.literal("")),
  avatarUrl: z.string().url().max(1000).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  instagramUrl: z.string().url().max(1000).optional().or(z.literal("")),
  tiktokUrl: z.string().url().max(1000).optional().or(z.literal("")),
  youtubeUrl: z.string().url().max(1000).optional().or(z.literal("")),
  websiteUrl: z.string().url().max(1000).optional().or(z.literal("")),
  featuredMediaType: z.enum(["none", "bunny_video", "image"]).optional().default("none"),
  featuredVideoId: z.string().trim().optional().or(z.literal("")),
  featuredThumbnailUrl: z.string().url().max(1000).optional().or(z.literal("")),
  featuredImageUrl: z.string().url().max(1000).optional().or(z.literal("")),
});

export const tierCreateSchema = z.object({
  creatorId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(100),
  currency: z.string().trim().length(3).default("CZK"),
  rank: z.coerce.number().int().min(1).max(100),
});

export const tierToggleSchema = z.object({
  tierId: z.string().uuid(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
});

export const tierDeleteSchema = z.object({
  tierId: z.string().uuid(),
});

const visibilityEnum = z.enum(["public", "members", "tier"]);

const minRankSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    return Number(value);
  },
  z.number().int().min(1).max(100).optional(),
);

export const postCreateSchema = z
  .object({
    creatorId: z.string().uuid(),
    title: z.string().trim().min(2).max(180),
    body: z.string().trim().max(50000).optional().or(z.literal("")),
    visibility: visibilityEnum,
    minTierRank: minRankSchema,
    creatorVideoId: z.string().uuid().optional().or(z.literal("")),
    bunnyVideoId: z.string().trim().optional().or(z.literal("")),
    bunnyLibraryId: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      value.visibility !== "tier" || (typeof value.minTierRank === "number" && value.minTierRank >= 1),
    {
      message: "minTierRank is required when visibility is tier",
      path: ["minTierRank"],
    },
  );

export const postUpdateSchema = postCreateSchema.extend({
  id: z.string().uuid(),
  removeVideo: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export const checkoutSchema = z.object({
  tierId: z.string().uuid(),
});

export const bunnyCreateUploadSchema = z.object({
  title: z.string().trim().max(200).optional(),
  creatorId: z.string().uuid().optional(),
});

export const bunnyEmbedTokenSchema = z.object({
  videoId: z.string().trim().min(3),
  libraryId: z.string().trim().optional(),
});

export const commentCreateSchema = z.object({
  postId: z.string().uuid(),
  creatorSlug: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
});

export const creatorVideoUpsertSchema = z.object({
  creatorId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  bunnyVideoId: z.string().trim().min(1),
  bunnyLibraryId: z.string().trim().min(1),
  thumbnailUrl: z.string().url().max(1000).optional().or(z.literal("")),
});

export const viewerProfileSchema = z.object({
  username: z.string().trim().min(3).max(40).optional().or(z.literal("")),
  displayName: z.string().trim().min(1).max(120).optional().or(z.literal("")),
  avatarUrl: z.string().url().max(1000).optional().or(z.literal("")),
});

export const analyticsEventSchema = z.object({
  eventType: z.enum(["post_view", "video_play_intent", "video_play_started"]),
  creatorId: z.string().uuid(),
  postId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  sessionId: z.string().trim().max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const stripeEventJobSchema = z.object({
  eventId: z.string().min(1),
});

export const bunnySyncJobSchema = z.object({
  assetId: z.string().uuid(),
  videoId: z.string().min(1),
  libraryId: z.string().min(1),
});

export const emailSendJobSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
});

export const analyticsAggregateJobSchema = z.object({
  creatorId: z.string().uuid(),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type StripeEventJobPayload = z.infer<typeof stripeEventJobSchema>;
export type BunnySyncJobPayload = z.infer<typeof bunnySyncJobSchema>;
export type EmailSendJobPayload = z.infer<typeof emailSendJobSchema>;
export type AnalyticsAggregateJobPayload = z.infer<typeof analyticsAggregateJobSchema>;
