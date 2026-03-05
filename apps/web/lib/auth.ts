import { redirect } from "next/navigation";

import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    redirect("/login");
  }

  return { user, supabase };
}
