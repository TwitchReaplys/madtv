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
      .select("id, tiers:tier_id ( price_cents, currency )", { count: "exact" })
      .in("status", ["active", "trialing"]),
    supabase
      .from("subscriptions")
      .select("id", { head: true, count: "exact" })
      .in("status", ["active", "trialing"]),
  ]);

  const gross = (activeSubs ?? []).reduce((sum, row) => {
    const relation = row.tiers as
      | { price_cents?: number; currency?: string }
      | { price_cents?: number; currency?: string }[]
      | null;
    const tier = Array.isArray(relation) ? relation[0] : relation;
    return sum + Number(tier?.price_cents ?? 0);
  }, 0);

  let feePercent = 10;
  const { data: feeRow } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "platform_fee_percent")
    .maybeSingle();

  if (typeof feeRow?.value === "number") {
    feePercent = feeRow.value;
  }

  const net = Math.max(0, Math.round(gross - gross * (feePercent / 100)));

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
            {toCurrency(gross)} / {toCurrency(net)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
