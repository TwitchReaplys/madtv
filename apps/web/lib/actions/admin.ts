"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requirePlatformAdminForMutation() {
  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return { supabase };
}

export async function updatePlatformSettingsAction(formData: FormData) {
  const schema = z.object({
    platformFeePercent: z.coerce.number().min(0).max(100),
    maintenanceMode: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
    enableNewCreatorSignup: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
  });

  const parsed = schema.safeParse({
    platformFeePercent: formData.get("platformFeePercent"),
    maintenanceMode: formData.get("maintenanceMode"),
    enableNewCreatorSignup: formData.get("enableNewCreatorSignup"),
  });

  if (!parsed.success) {
    redirect("/admin/settings?error=Invalid+settings+payload");
  }

  const { supabase } = await requirePlatformAdminForMutation();
  const rows = [
    { key: "platform_fee_percent", value: parsed.data.platformFeePercent },
    { key: "maintenance_mode", value: parsed.data.maintenanceMode },
    { key: "enable_new_creator_signup", value: parsed.data.enableNewCreatorSignup },
  ];

  for (const row of rows) {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: row.key, value: row.value }, { onConflict: "key" });

    if (error) {
      redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?success=Nastavení+uloženo");
}

export async function toggleUserBanAction(formData: FormData) {
  const schema = z.object({
    userId: z.string().uuid(),
    nextBanned: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
  });

  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    nextBanned: formData.get("nextBanned"),
  });

  if (!parsed.success) {
    redirect("/admin/users?error=Invalid+user+payload");
  }

  const { supabase } = await requirePlatformAdminForMutation();
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: parsed.data.nextBanned })
    .eq("id", parsed.data.userId);

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?success=User+updated");
}

export async function updateCreatorStatusAction(formData: FormData) {
  const schema = z.object({
    creatorId: z.string().uuid(),
    status: z.enum(["active", "pending", "disabled"]),
  });

  const parsed = schema.safeParse({
    creatorId: formData.get("creatorId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect("/admin/creators?error=Invalid+creator+payload");
  }

  const { supabase } = await requirePlatformAdminForMutation();
  const { error } = await supabase
    .from("creators")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.creatorId);

  if (error) {
    redirect(`/admin/creators?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/creators");
  redirect("/admin/creators?success=Creator+updated");
}

export async function updateCreatorFeeAction(formData: FormData) {
  const schema = z.object({
    creatorId: z.string().uuid(),
    platformFeePercent: z.coerce.number().min(0).max(100),
  });

  const parsed = schema.safeParse({
    creatorId: formData.get("creatorId"),
    platformFeePercent: formData.get("platformFeePercent"),
  });

  if (!parsed.success) {
    redirect("/admin/creators?error=Invalid+fee+payload");
  }

  const { supabase } = await requirePlatformAdminForMutation();
  const { error } = await supabase
    .from("creators")
    .update({ platform_fee_percent: parsed.data.platformFeePercent })
    .eq("id", parsed.data.creatorId);

  if (error) {
    redirect(`/admin/creators?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/creators");
  redirect("/admin/creators?success=Creator+fee+updated");
}

export async function toggleCreatorFeaturedAction(formData: FormData) {
  const schema = z.object({
    creatorId: z.string().uuid(),
    nextFeatured: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
  });

  const parsed = schema.safeParse({
    creatorId: formData.get("creatorId"),
    nextFeatured: formData.get("nextFeatured"),
  });

  if (!parsed.success) {
    redirect("/admin/creators?error=Invalid+creator+payload");
  }

  const { supabase } = await requirePlatformAdminForMutation();
  const { error } = await supabase
    .from("creators")
    .update({ is_featured: parsed.data.nextFeatured })
    .eq("id", parsed.data.creatorId);

  if (error) {
    redirect(`/admin/creators?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/explore");
  revalidatePath("/admin/creators");
  redirect("/admin/creators?success=Creator+feature+updated");
}
