import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabasePublicEnv, supabaseAnonKey, supabaseUrl } from "./shared";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function createServerSupabaseClient() {
  assertSupabasePublicEnv();

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where setting cookies is not allowed.
        }
      },
    },
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  });
}
