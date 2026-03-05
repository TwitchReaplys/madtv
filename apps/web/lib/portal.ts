import { redirect } from "next/navigation";

import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreatorAccess = {
  creatorId: string;
  role: "owner" | "admin" | "moderator";
  title: string;
  slug: string;
  status: "active" | "pending" | "disabled";
  onboardingStatus: "draft" | "submitted" | "email_verified" | "stripe_pending" | "stripe_connected" | "approved" | "rejected";
  stripeConnectReady: boolean;
};

export async function requireDashboardUser() {
  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_banned) {
    await supabase.auth.signOut();
    redirect("/login?error=Account+disabled");
  }

  const { data: memberships } = await supabase
    .from("creator_members")
    .select(
      "creator_id, role, creators!inner ( id, title, slug, status, onboarding_status, stripe_connect_payouts_enabled, stripe_connect_details_submitted )",
    )
    .eq("user_id", user.id)
    .in("role", ["owner", "admin", "moderator"]);

  const creatorAccess = (memberships ?? [])
    .map((row) => {
      const creatorRelation = row.creators as
        | {
            id?: string;
            title?: string;
            slug?: string;
            status?: string;
            onboarding_status?: string;
            stripe_connect_payouts_enabled?: boolean;
            stripe_connect_details_submitted?: boolean;
          }
        | {
            id?: string;
            title?: string;
            slug?: string;
            status?: string;
            onboarding_status?: string;
            stripe_connect_payouts_enabled?: boolean;
            stripe_connect_details_submitted?: boolean;
          }[]
        | null;

      const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
      if (!creator?.id || !creator.slug || !creator.title) {
        return null;
      }

      const role = row.role as "owner" | "admin" | "moderator";
      const status = (creator.status as "active" | "pending" | "disabled" | null) ?? "active";
      const onboardingStatus =
        (creator.onboarding_status as
          | "draft"
          | "submitted"
          | "email_verified"
          | "stripe_pending"
          | "stripe_connected"
          | "approved"
          | "rejected"
          | null) ?? "draft";
      const stripeConnectReady = Boolean(
        creator.stripe_connect_payouts_enabled && creator.stripe_connect_details_submitted,
      );

      return {
        creatorId: creator.id,
        role,
        title: creator.title,
        slug: creator.slug,
        status,
        onboardingStatus,
        stripeConnectReady,
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
