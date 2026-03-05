import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreatorAccess = {
  creatorId: string;
  role: "owner" | "admin" | "moderator";
  title: string;
  slug: string;
  status: "active" | "pending" | "disabled";
};

export async function requireDashboardUser() {
  const supabase = await createServerSupabaseClient();
  const cookieStore = await cookies();
  const { user } = await getAuthUser(supabase, cookieStore.getAll());

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_banned) {
    redirect("/logout");
  }

  const { data: memberships } = await supabase
    .from("creator_members")
    .select("creator_id, role, creators!inner ( id, title, slug, status )")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin", "moderator"]);

  const creatorAccess = (memberships ?? [])
    .map((row) => {
      const creatorRelation = row.creators as
        | { id?: string; title?: string; slug?: string; status?: string }
        | { id?: string; title?: string; slug?: string; status?: string }[]
        | null;

      const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
      if (!creator?.id || !creator.slug || !creator.title) {
        return null;
      }

      const role = row.role as "owner" | "admin" | "moderator";
      const status = (creator.status as "active" | "pending" | "disabled" | null) ?? "active";

      return {
        creatorId: creator.id,
        role,
        title: creator.title,
        slug: creator.slug,
        status,
      } satisfies CreatorAccess;
    })
    .filter((entry): entry is CreatorAccess => entry !== null);

  let isPlatformAdmin = false;

  try {
    const { data } = await supabase.rpc("is_platform_admin");
    isPlatformAdmin = Boolean(data);
  } catch {
    isPlatformAdmin = false;
  }

  return {
    supabase,
    user,
    creatorAccess,
    hasCreatorAccess: creatorAccess.length > 0,
    hasViewerAccess: true,
    isPlatformAdmin,
  };
}

export async function requireCreatorAccess(creatorId: string) {
  const context = await requireDashboardUser();
  const creator = context.creatorAccess.find((entry) => entry.creatorId === creatorId);

  if (!creator) {
    redirect("/dashboard/creator");
  }

  return {
    ...context,
    creator,
  };
}

export async function requirePlatformAdmin() {
  const context = await requireDashboardUser();

  if (!context.isPlatformAdmin) {
    redirect("/dashboard");
  }

  return context;
}
