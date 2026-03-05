import Link from "next/link";

import { Notice } from "@/components/notice";
import { upsertCreatorAction } from "@/lib/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorPortalOverviewPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;
  const { creatorAccess } = await requireDashboardUser();

  if (creatorAccess.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Become a creator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />
          <form action={upsertCreatorAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Slug</label>
              <Input name="slug" required placeholder="my-channel" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input name="title" required placeholder="My Creator Brand" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tagline</label>
              <Input name="tagline" placeholder="Krátký popis profilu" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">About</label>
              <Textarea name="about" rows={5} />
            </div>
            <Button type="submit">Create creator profile</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const defaultCreator = creatorAccess[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Creator portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/dashboard/creator/${defaultCreator.creatorId}/profile`}>Otevřít výchozího tvůrce</Link>
            </Button>
          </div>

          <div className="grid gap-3">
            {creatorAccess.map((creator) => (
              <div key={creator.creatorId} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{creator.title}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">@{creator.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{creator.role}</Badge>
                    <Badge variant="outline">{creator.status}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/creator/${creator.creatorId}/profile`}>Profile</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/creator/${creator.creatorId}/tiers`}>Tiers</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/creator/${creator.creatorId}/posts`}>Posts</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/creator/${creator.creatorId}/videos`}>Videos</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/creator/${creator.creatorId}/subscribers`}>Subscribers</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/creator/${creator.creatorId}/analytics`}>Analytics</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/creator/${creator.creatorId}/settings`}>Settings</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
