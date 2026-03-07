import { z } from "zod";

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_APP_WEB_URL: z.string().url(),
  EXPO_PUBLIC_APP_SCHEME: z.string().min(1),
  EXPO_PUBLIC_BUNNY_LIBRARY_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid mobile env: ${message}`);
}

export const env = parsed.data;
