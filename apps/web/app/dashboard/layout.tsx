import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/creator", label: "Creator" },
  { href: "/dashboard/tiers", label: "Tiers" },
  { href: "/dashboard/posts", label: "Posts" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Signed in as {user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Creator panel</Badge>
              <Button asChild variant="outline" size="sm">
                <a href="/logout">Logout</a>
              </Button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {NAV_LINKS.map((item) => (
              <Button key={item.href} asChild variant="secondary" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
