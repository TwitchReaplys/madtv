import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
};

export default async function CreatorSettingsPage({ params }: PageProps) {
  const { creatorId } = await params;
  const { creator } = await requireCreatorAccess(creatorId);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Nastavení · {creator.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
        <p>Slug: @{creator.slug}</p>
        <p>Stav: {creator.status}</p>
        <p>Onboarding: {creator.onboardingStatus}</p>
        <p>Stripe Connect: {creator.stripeConnectReady ? "ready" : "pending"}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/c/${creator.slug}`} className="underline">
            Otevřít veřejnou stránku
          </Link>
          <span>•</span>
          <Link href={`/dashboard/creator/${creatorId}/profile`} className="underline">
            Upravit profil a featured media
          </Link>
          <span>•</span>
          <Link href={`/dashboard/creator/${creatorId}/onboarding`} className="underline">
            Otevřít onboarding
          </Link>
          <span>•</span>
          <Link href={`/dashboard/creator/${creatorId}/onboarding#stripe-connect`} className="underline">
            Stripe Connect krok
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
