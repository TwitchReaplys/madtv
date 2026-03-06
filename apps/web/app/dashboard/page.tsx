import Link from "next/link";
import { Eye, FileText, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

function toCurrency(cents: number, currency = "CZK") {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function DashboardHomePage() {
  const { supabase, user, creatorAccess } = await requireDashboardUser();
  const defaultCreator = creatorAccess[0] ?? null;

  const [{ count: activeSubscriptions }, { count: totalSubscriptions }, creatorStats] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"]),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    defaultCreator
      ? Promise.all([
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", defaultCreator.creatorId),
          supabase
            .from("analytics_daily_creator")
            .select("post_views, net_revenue_cents")
            .eq("creator_id", defaultCreator.creatorId),
        ])
      : Promise.resolve(null),
  ]);

  const creatorPosts = creatorStats?.[0].count ?? 0;
  const creatorViews =
    creatorStats?.[1].data?.reduce((sum, row) => sum + (row.post_views ?? 0), 0) ?? 0;
  const creatorNetRevenueCents =
    creatorStats?.[1].data?.reduce((sum, row) => sum + Number(row.net_revenue_cents ?? 0), 0) ?? 0;

  const cards = [
    {
      title: "Aktivní členství",
      value: String(activeSubscriptions ?? 0),
      icon: Users,
    },
    {
      title: "Celkem členství",
      value: String(totalSubscriptions ?? 0),
      icon: Users,
    },
    {
      title: "Příspěvky tvůrce",
      value: String(creatorPosts),
      icon: FileText,
    },
    {
      title: "Zobrazení obsahu",
      value: creatorViews.toLocaleString("cs-CZ"),
      icon: Eye,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-[var(--accent)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/posts/new" className="text-[var(--accent)] underline">
              Vytvořit nový příspěvek
            </Link>
            <span className="text-zinc-500">•</span>
            <Link href="/dashboard/viewer/subscriptions" className="text-[var(--accent)] underline">
              Správa členství
            </Link>
            <span className="text-zinc-500">•</span>
            <Link href="/explore" className="text-[var(--accent)] underline">
              Projít tvůrce
            </Link>
          </div>
          {defaultCreator ? (
            <p className="text-zinc-600 dark:text-zinc-300">
              {defaultCreator.title}: čistý příjem{" "}
              <strong>{toCurrency(creatorNetRevenueCents)}</strong>
            </p>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-300">
              Zatím nemáš přístup k žádnému creator workspace.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
