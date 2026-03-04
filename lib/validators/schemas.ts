import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const creatorSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(slugRegex, "Slug must be lowercase letters, numbers and hyphens"),
  title: z.string().trim().min(2).max(120),
  about: z.string().trim().max(5000).optional().or(z.literal("")),
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

export const postCreateSchema = z
  .object({
    creatorId: z.string().uuid(),
    title: z.string().trim().min(2).max(180),
    body: z.string().trim().max(50000).optional().or(z.literal("")),
    visibility: visibilityEnum,
    minTierRank: z.preprocess(
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
    ),
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
});

export const bunnyEmbedTokenSchema = z.object({
  videoId: z.string().trim().min(3),
  libraryId: z.string().trim().optional(),
});
