import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const cookieStore = await cookies();
  const { user } = await getAuthUser(supabase, cookieStore.getAll());

  if (!user) {
    redirect("/login");
  }

  return { user, supabase };
}
