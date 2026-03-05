"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicEnv, buildSupabaseCookieOptions, supabaseAnonKey, supabaseUrl } from "./shared";

export function createBrowserSupabaseClient() {
  assertSupabasePublicEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: buildSupabaseCookieOptions(),
  });
}
