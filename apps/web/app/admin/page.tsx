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

function getSettingNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (value && typeof value === "object" && "value" in value) {
    return getSettingNumber((value as { value?: unknown }).value);
  }

  return null;
}

function normalizePercent(raw: unknown, fallback: number) {
  const parsed = getSettingNumber(raw);
  const value = parsed ?? fallback;
  return Math.min(100, Math.max(0, value));
}

function computeNetRevenueCents(grossRevenueCents: number, feePercent: number, vatPercent: number) {
  if (grossRevenueCents <= 0) {
    return 0;
  }

  const vatAmountCents =
    vatPercent > 0 ? Math.round((grossRevenueCents * vatPercent) / (100 + vatPercent)) : 0;
  const platformFeeCents = feePercent > 0 ? Math.round((grossRevenueCents * feePercent) / 100) : 0;

  return Math.max(0, grossRevenueCents - vatAmountCents - platformFeeCents);
}

export default async function AdminOverviewPage() {
  const { supabase } = await requirePlatformAdmin();

  const [{ count: creatorsCount }, { data: activeSubs }, { count: activeSubsCount }, { data: settingsRows }] =
    await Promise.all([
    supabase.from("creators").select("id", { head: true, count: "exact" }),
    supabase
      .from("subscriptions")
      .select("id, tiers:tier_id ( price_cents, currency, creators:creator_id ( platform_fee_percent ) )", { count: "exact" })
      .in("status", ["active", "trialing"]),
    supabase
      .from("subscriptions")
      .select("id", { head: true, count: "exact" })
      .in("status", ["active", "trialing"]),
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["platform_fee_percent", "vat_percent"]),
    ]);

  const settingsMap = new Map<string, unknown>((settingsRows ?? []).map((row) => [row.key, row.value]));
  const defaultFeePercent = normalizePercent(settingsMap.get("platform_fee_percent"), 10);
  const vatPercent = normalizePercent(settingsMap.get("vat_percent"), 21);

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
      const feePercent = normalizePercent(rawFee, defaultFeePercent);

      acc.gross += priceCents;
      acc.net += computeNetRevenueCents(priceCents, feePercent, vatPercent);

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
          <CardTitle>MRR approx (gross / creator net)</CardTitle>
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
