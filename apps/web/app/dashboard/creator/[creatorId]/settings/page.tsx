import Link from "next/link";

import { Notice } from "@/components/notice";
import { updateCreatorPricingSettingsAction } from "@/lib/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatPriceAmount(cents: number | null | undefined) {
  if (typeof cents !== "number") {
    return "";
  }

  return (cents / 100).toLocaleString("cs-CZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function CreatorSettingsPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const { data: creatorSettings } = await supabase
    .from("creators")
    .select("pricing_mode, single_price_cents, single_price_currency")
    .eq("id", creatorId)
    .maybeSingle();

  const pricingMode = creatorSettings?.pricing_mode === "single" ? "single" : "tiers";
  const singlePriceAmount = formatPriceAmount(creatorSettings?.single_price_cents);
  const singlePriceCurrency = creatorSettings?.single_price_currency ?? "CZK";

  return (
    <div className="space-y-4">
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
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Zobrazení cen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />

          <form action={updateCreatorPricingSettingsAction} className="space-y-4">
            <input type="hidden" name="creatorId" value={creatorId} />
            <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/settings`} />

            <div>
              <label className="mb-1 block text-sm font-medium">Model cen</label>
              <select
                name="pricingMode"
                defaultValue={pricingMode}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="tiers">Tiery (více úrovní členství)</option>
                <option value="single">Jednotná cena bez tierů</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Jednotná cena</label>
                <Input
                  name="singlePriceAmount"
                  defaultValue={singlePriceAmount}
                  placeholder="199,00"
                />
                <p className="mt-1 text-xs text-zinc-500">Použij formát 199 nebo 199,00 (desetinná čárka).</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Měna</label>
                <Input
                  name="singlePriceCurrency"
                  defaultValue={singlePriceCurrency}
                  maxLength={3}
                  className="uppercase"
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Při režimu „Jednotná cena“ se na public stránce zobrazí jeden plán místo tier tabulky.
            </p>

            <Button type="submit">Uložit nastavení cen</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
