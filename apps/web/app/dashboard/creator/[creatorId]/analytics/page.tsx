import { requireCreatorAccess } from "@/lib/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveDateParam(value: string | string[] | undefined, fallback: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return fallback;
}

function toCurrency(cents: number, currency = "CZK") {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function CreatorAnalyticsPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const today = new Date();
  const fromDefaultDate = new Date(today);
  fromDefaultDate.setUTCDate(fromDefaultDate.getUTCDate() - 29);

  const fromDefault = fromDefaultDate.toISOString().slice(0, 10);
  const toDefault = today.toISOString().slice(0, 10);
  const from = resolveDateParam(query.from, fromDefault);
  const to = resolveDateParam(query.to, toDefault);

  const [{ data: rows }, { count: activeSubscribers }] = await Promise.all([
    supabase
      .from("analytics_daily_creator")
      .select("date, post_views, video_play_intents, video_play_started, unique_viewers, gross_revenue_cents, net_revenue_cents")
      .eq("creator_id", creatorId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorId)
      .in("status", ["active", "trialing"]),
  ]);

  const totals = (rows ?? []).reduce(
    (acc, row) => {
      acc.postViews += row.post_views ?? 0;
      acc.playIntents += row.video_play_intents ?? 0;
      acc.playStarted += row.video_play_started ?? 0;
      acc.uniqueViewers += row.unique_viewers ?? 0;
      acc.gross += Number(row.gross_revenue_cents ?? 0);
      acc.net += Number(row.net_revenue_cents ?? 0);
      return acc;
    },
    {
      postViews: 0,
      playIntents: 0,
      playStarted: 0,
      uniqueViewers: 0,
      gross: 0,
      net: 0,
    },
  );

  const maxViews = Math.max(...(rows ?? []).map((row) => row.post_views ?? 0), 1);

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Analytics · {creator.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">From</label>
              <Input type="date" name="from" defaultValue={from} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">To</label>
              <Input type="date" name="to" defaultValue={to} />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Apply
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-500">Active subscribers</p>
            <p className="text-2xl font-bold">{activeSubscribers ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-500">Revenue gross / net</p>
            <p className="text-xl font-bold">
              {toCurrency(totals.gross)} / {toCurrency(totals.net)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-500">Views / Play intents</p>
            <p className="text-xl font-bold">
              {totals.postViews} / {totals.playIntents}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Daily series</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(rows ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">No analytics data for selected period.</p>
          ) : (
            rows?.map((row) => (
              <div key={row.date} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{row.date}</span>
                  <span>
                    views {row.post_views} · intents {row.video_play_intents} · uniques {row.unique_viewers}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${Math.max(2, ((row.post_views ?? 0) / maxViews) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
