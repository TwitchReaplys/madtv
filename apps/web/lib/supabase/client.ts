"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicEnv, supabaseAnonKey, supabaseUrl } from "./shared";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function createBrowserSupabaseClient() {
  assertSupabasePublicEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  });
}
