import Link from "next/link";
import { Eye, FileText, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <div className="max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-primary" />
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
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="glow">
              <Link href="/dashboard/posts/new">Vytvořit nový příspěvek</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/viewer/subscriptions">Správa členství</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/explore">Projít tvůrce</Link>
            </Button>
          </div>
          {defaultCreator ? (
            <p className="text-muted-foreground">
              {defaultCreator.title}: čistý příjem{" "}
              <strong>{toCurrency(creatorNetRevenueCents)}</strong>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Zatím nemáš přístup k žádnému creator workspace.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
