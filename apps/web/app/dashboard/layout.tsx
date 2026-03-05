import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, hasCreatorAccess, hasViewerAccess, isPlatformAdmin } = await requireDashboardUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasViewerAccess ? <Badge variant="secondary">Viewer</Badge> : null}
              {hasCreatorAccess ? <Badge variant="secondary">Creator</Badge> : null}
              {isPlatformAdmin ? <Badge variant="secondary">Platform Admin</Badge> : null}
              <Button asChild variant="outline" size="sm">
                <Link href="/logout">Odhlásit se</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/viewer">Viewer portal</Link>
            </Button>
            {hasCreatorAccess ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard/creator">Creator portal</Link>
              </Button>
            ) : null}
            {isPlatformAdmin ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin">Admin</Link>
              </Button>
            ) : null}
          </div>

          <nav className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/viewer">Overview</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/viewer/subscriptions">Subscriptions</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/viewer/profile">Profile</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/viewer/billing">Billing</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/explore">Explore</Link>
            </Button>
          </nav>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
