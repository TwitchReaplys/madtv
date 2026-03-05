import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabasePublicEnv, buildSupabaseCookieOptions, supabaseAnonKey, supabaseUrl } from "./shared";

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
    cookieOptions: buildSupabaseCookieOptions(),
  });
}
