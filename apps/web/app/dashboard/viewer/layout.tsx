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
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/viewer">Overview</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/viewer/subscriptions">Subscriptions</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/viewer/profile">Profile</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/viewer/billing">Billing</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/viewer/explore">Explore</Link>
          </Button>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
