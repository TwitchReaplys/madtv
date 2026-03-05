import { redirect } from "next/navigation";

import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const { hasCreatorAccess } = await requireDashboardUser();

  if (hasCreatorAccess) {
    redirect("/dashboard/creator");
  }

  redirect("/dashboard/viewer");
}
