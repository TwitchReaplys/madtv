import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function ViewerSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardUser();
  return <>{children}</>;
}
