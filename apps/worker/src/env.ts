function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export const env = {
  supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: getRequiredEnv("STRIPE_SECRET_KEY"),
  redisUrl: getRequiredEnv("REDIS_URL"),
  bunnyStreamApiKey: process.env.BUNNY_STREAM_API_KEY ?? "",
  bunnyStreamLibraryId: process.env.BUNNY_STREAM_LIBRARY_ID ?? "",
};
