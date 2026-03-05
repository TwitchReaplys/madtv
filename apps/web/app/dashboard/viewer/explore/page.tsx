import { redirect } from "next/navigation";

import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function ViewerExploreRedirectPage() {
  await requireDashboardUser();
  redirect("/explore");
}
