import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function ViewerSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireDashboardUser();

  const viewerLinks = [
    { href: "/dashboard/viewer", label: "Přehled" },
    { href: "/dashboard/viewer/subscriptions", label: "Členství" },
    { href: "/dashboard/viewer/profile", label: "Profil" },
    { href: "/dashboard/viewer/billing", label: "Platby" },
    { href: "/dashboard/viewer/explore", label: "Najít tvůrce" },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden glass">
        <div className="border-b border-zinc-200/70 bg-gradient-to-r from-sky-500/12 via-[var(--accent)]/10 to-transparent px-6 py-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Viewer workspace</p>
          <p className="mt-1 text-lg font-semibold">{user.email}</p>
        </div>
        <CardContent className="pt-4">
          <nav className="flex flex-wrap gap-2">
            {viewerLinks.map((link) => (
              <Button key={link.href} asChild size="sm" variant="outline">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
