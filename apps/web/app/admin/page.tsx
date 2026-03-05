import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/portal";

export const dynamic = "force-dynamic";

function toCurrency(cents: number, currency = "CZK") {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function AdminOverviewPage() {
  const { supabase } = await requirePlatformAdmin();

  const [{ count: creatorsCount }, { data: activeSubs }, { count: activeSubsCount }] = await Promise.all([
    supabase.from("creators").select("id", { head: true, count: "exact" }),
    supabase
      .from("subscriptions")
      .select("id, tiers:tier_id ( price_cents, currency, creators:creator_id ( platform_fee_percent ) )", { count: "exact" })
      .in("status", ["active", "trialing"]),
    supabase
      .from("subscriptions")
      .select("id", { head: true, count: "exact" })
      .in("status", ["active", "trialing"]),
  ]);

  const financials = (activeSubs ?? []).reduce(
    (acc, row) => {
      const relation = row.tiers as
        | {
            price_cents?: number;
            currency?: string;
            creators?:
              | {
                  platform_fee_percent?: number | string | null;
                }
              | {
                  platform_fee_percent?: number | string | null;
                }[]
              | null;
          }
        | {
            price_cents?: number;
            currency?: string;
            creators?:
              | {
                  platform_fee_percent?: number | string | null;
                }
              | {
                  platform_fee_percent?: number | string | null;
                }[]
              | null;
          }[]
        | null;
      const tier = Array.isArray(relation) ? relation[0] : relation;
      const priceCents = Number(tier?.price_cents ?? 0);
      const creatorRelation = tier?.creators;
      const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
      const rawFee = creator?.platform_fee_percent;
      const parsedFee = typeof rawFee === "string" ? Number(rawFee) : Number(rawFee ?? 10);
      const feePercent = Number.isFinite(parsedFee) ? Math.min(100, Math.max(0, parsedFee)) : 10;

      acc.gross += priceCents;
      acc.net += Math.max(0, Math.round(priceCents - priceCents * (feePercent / 100)));

      return acc;
    },
    { gross: 0, net: 0 },
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Creators</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{creatorsCount ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{activeSubsCount ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>MRR approx (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold">
            {toCurrency(financials.gross)} / {toCurrency(financials.net)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
