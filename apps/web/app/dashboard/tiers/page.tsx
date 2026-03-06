import Link from "next/link";

import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTierAction, deleteTierAction, toggleTierAction } from "@/lib/actions/dashboard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardTiersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { supabase, user } = await requireUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, title")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return (
      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>Tiery</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nejdřív je potřeba creator profil. Otevři{" "}
          <Link href="/dashboard/creator" className="underline">
            Creator profil
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  const { data: tiers } = await supabase
    .from("tiers")
    .select("id, name, description, price_cents, currency, rank, is_active, stripe_price_id, created_at")
    .eq("creator_id", creator.id)
    .order("rank", { ascending: true });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Nový tier</CardTitle>
          <p className="text-sm text-muted-foreground">Při vytvoření tieru se automaticky založí Stripe Product + Price.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />

          <form action={createTierAction} className="space-y-4">
            <input type="hidden" name="creatorId" value={creator.id} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Název</label>
              <Input name="name" type="text" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Popis</label>
              <Textarea name="description" rows={3} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cena (haléře)</label>
                <Input name="priceCents" type="number" min={100} step={1} required defaultValue={199} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Měna</label>
                <Input name="currency" type="text" required defaultValue="CZK" maxLength={3} className="uppercase" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rank</label>
                <Input name="rank" type="number" min={1} step={1} required defaultValue={1} />
              </div>
            </div>

            <Button type="submit" className="glow">
              Vytvořit tier
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Existující tiery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(tiers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím žádné tiery.</p>
          ) : (
            tiers?.map((tier) => (
              <article key={tier.id} className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Rank {tier.rank} · {(tier.price_cents / 100).toFixed(2)} {tier.currency}
                    </p>
                    {tier.description ? <p className="text-sm text-muted-foreground">{tier.description}</p> : null}
                    <p className="text-xs text-muted-foreground">Stripe price: {tier.stripe_price_id ?? "n/a"}</p>
                  </div>
                  <Badge variant={tier.is_active ? "secondary" : "outline"}>{tier.is_active ? "Aktivní" : "Neaktivní"}</Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={toggleTierAction}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <input type="hidden" name="isActive" value={tier.is_active ? "false" : "true"} />
                    <Button type="submit" variant="outline" size="sm">
                      {tier.is_active ? "Deaktivovat" : "Aktivovat"}
                    </Button>
                  </form>

                  <form action={deleteTierAction}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Smazat
                    </Button>
                  </form>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
