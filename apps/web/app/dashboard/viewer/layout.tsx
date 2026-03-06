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
  await requireDashboardUser();

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200/70 bg-gradient-to-r from-sky-500/12 via-[var(--accent)]/8 to-transparent px-6 py-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Viewer portal</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Správa členství, profilu a plateb na jednom místě.</p>
        </div>
        <CardContent className="flex flex-wrap gap-2 pt-4">
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/viewer">Overview</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/viewer/subscriptions">Subscriptions</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/viewer/profile">Profile</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/viewer/billing">Billing</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/viewer/explore">Explore</Link>
          </Button>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
