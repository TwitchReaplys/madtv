import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, hasCreatorAccess, hasViewerAccess, isPlatformAdmin } = await requireDashboardUser();

  const portalLinks = [
    { href: "/dashboard/viewer", label: "Divák", show: hasViewerAccess },
    { href: "/dashboard/creator", label: "Tvůrce", show: hasCreatorAccess },
    { href: "/admin", label: "Admin", show: isPlatformAdmin },
  ].filter((link) => link.show);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden glass">
        <div className="bg-gradient-to-r from-[var(--accent)]/16 via-sky-500/12 to-transparent px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Účet</p>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasViewerAccess ? <Badge variant="secondary">Viewer</Badge> : null}
              {hasCreatorAccess ? <Badge variant="secondary">Creator</Badge> : null}
              {isPlatformAdmin ? <Badge variant="secondary">Platform Admin</Badge> : null}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {portalLinks.map((portal, index) => (
              <Button key={portal.href} asChild size="sm" variant={index === 0 ? "default" : "outline"}>
                <Link href={portal.href}>{portal.label}</Link>
              </Button>
            ))}
            <form action="/logout" method="post">
              <Button variant="outline" size="sm" type="submit">
                Odhlásit se
              </Button>
            </form>
          </div>
        </div>
      </Card>

      {children}
    </div>
  );
}
