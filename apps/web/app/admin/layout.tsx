import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin">Overview</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/settings">Settings</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/users">Users</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/creators">Creators</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/services">Services</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
