import Link from "next/link";

import { Notice } from "@/components/notice";
import { upsertCreatorOnboardingAction } from "@/lib/actions/dashboard";
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
  const { creatorAccess, user } = await requireDashboardUser();
  const emailVerifiedAt =
    user.email_confirmed_at ?? (user as { confirmed_at?: string | null }).confirmed_at ?? null;

  if (creatorAccess.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />
          {emailVerifiedAt ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-300">Email ověřen: {new Date(emailVerifiedAt).toLocaleString()}</p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              Před Stripe krokem bude potřeba ověřit email účtu.
            </p>
          )}
          <form action={upsertCreatorOnboardingAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Slug</label>
                <Input name="slug" required placeholder="my-channel" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Název profilu</label>
                <Input name="title" required placeholder="My Creator Brand" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Jméno / obchodní název</label>
                <Input name="legalFullName" required placeholder="Jan Novák / Studio XYZ" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">IČO</label>
                <Input name="legalBusinessId" required placeholder="12345678" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Kontaktní email</label>
                <Input name="contactEmail" type="email" required defaultValue={user.email ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mobil</label>
                <Input name="contactPhone" required placeholder="+420..." />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Ulice a číslo</label>
                <Input name="addressLine1" required placeholder="Náměstí 1" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Doplňující adresa (volitelné)</label>
                <Input name="addressLine2" placeholder="Patro, kancelář..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Město</label>
                <Input name="addressCity" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">PSČ</label>
                <Input name="addressPostalCode" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Země (ISO-2)</label>
                <Input name="addressCountry" required defaultValue="CZ" maxLength={2} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Zaměření videí na platformě</label>
              <Textarea
                name="contentFocus"
                rows={5}
                required
                placeholder="Popiš, jaký obsah budeš publikovat (formát, frekvence, cílovka)."
              />
            </div>
            <Button type="submit">Uložit onboarding a pokračovat</Button>
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
                  <Badge variant="secondary">{creator.onboardingStatus}</Badge>
                  {creator.stripeConnectReady ? <Badge variant="secondary">Stripe ready</Badge> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/dashboard/creator/${creator.creatorId}/onboarding`}>Onboarding</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/creator/${creator.creatorId}/onboarding#stripe-connect`}>Stripe Connect</Link>
                </Button>
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
