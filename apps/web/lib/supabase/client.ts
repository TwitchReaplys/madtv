"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicEnv, supabaseAnonKey, supabaseUrl } from "./shared";

export function createBrowserSupabaseClient() {
  assertSupabasePublicEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
