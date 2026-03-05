import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    redirect("/login");
  }

  return { user, supabase };
}
