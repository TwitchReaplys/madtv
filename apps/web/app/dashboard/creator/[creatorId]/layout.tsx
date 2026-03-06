import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { openStripeConnectDashboardAction } from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ creatorId: string }>;
};

export default async function CreatorSectionLayout({ children, params }: LayoutProps) {
  const { creatorId } = await params;
  const { creator } = await requireCreatorAccess(creatorId);

  const workspaceLinks = [
    { href: `/dashboard/creator/${creatorId}/profile`, label: "Profile" },
    { href: `/dashboard/creator/${creatorId}/tiers`, label: "Tiers" },
    { href: `/dashboard/creator/${creatorId}/posts`, label: "Posts" },
    { href: `/dashboard/creator/${creatorId}/videos`, label: "Videos" },
    { href: `/dashboard/creator/${creatorId}/subscribers`, label: "Subscribers" },
    { href: `/dashboard/creator/${creatorId}/analytics`, label: "Analytics" },
    { href: `/dashboard/creator/${creatorId}/settings`, label: "Settings" },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200/70 bg-gradient-to-r from-[var(--accent)]/12 via-sky-500/8 to-transparent px-6 py-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Creator workspace</p>
          <p className="mt-1 text-lg font-semibold">
            {creator.title} <span className="text-zinc-500">@{creator.slug}</span>
          </p>
        </div>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/dashboard/creator/${creatorId}/onboarding`}>Onboarding</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/dashboard/creator/${creatorId}/onboarding#stripe-connect`}>Stripe Connect</Link>
            </Button>
            <form action={openStripeConnectDashboardAction}>
              <input type="hidden" name="creatorId" value={creatorId} />
              <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/onboarding`} />
              <Button size="sm" type="submit">
                Stripe Dashboard
              </Button>
            </form>
          </div>
          <nav className="flex flex-wrap gap-2">
            {workspaceLinks.map((link) => (
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
