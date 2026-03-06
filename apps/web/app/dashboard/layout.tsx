import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, creatorAccess, hasCreatorAccess, hasViewerAccess, isPlatformAdmin } = await requireDashboardUser();

  return (
    <DashboardShell
      userEmail={user.email ?? null}
      hasCreatorAccess={hasCreatorAccess}
      hasViewerAccess={hasViewerAccess}
      isPlatformAdmin={isPlatformAdmin}
      defaultCreatorSlug={creatorAccess[0]?.slug ?? null}
    >
      {children}
    </DashboardShell>
  );
}
