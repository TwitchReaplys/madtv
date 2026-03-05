import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ creatorId: string }>;
};

export default async function CreatorSectionLayout({ children, params }: LayoutProps) {
  const { creatorId } = await params;
  const { creator } = await requireCreatorAccess(creatorId);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="text-sm text-zinc-500">Creator workspace</p>
            <p className="font-semibold">
              {creator.title} <span className="text-zinc-500">@{creator.slug}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/creator/${creatorId}/profile`}>Profile</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/creator/${creatorId}/tiers`}>Tiers</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/creator/${creatorId}/posts`}>Posts</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/creator/${creatorId}/videos`}>Videos</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/creator/${creatorId}/subscribers`}>Subscribers</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/creator/${creatorId}/analytics`}>Analytics</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/creator/${creatorId}/settings`}>Settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
