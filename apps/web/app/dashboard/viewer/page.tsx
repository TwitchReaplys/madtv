import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function ViewerDashboardPage() {
  const { supabase, user } = await requireDashboardUser();

  const [{ data: subscriptions }, { data: profile }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, status, current_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle(),
  ]);

  const activeCount = (subscriptions ?? []).filter((subscription) =>
    ["active", "trialing"].includes(subscription.status),
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Viewer overview</CardTitle>
          <CardDescription>
            {profile?.display_name || profile?.username || user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">Aktivní členství</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">Celkem členství</p>
            <p className="text-2xl font-bold">{subscriptions?.length ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">Rychlý vstup</p>
            <Link href="/explore" className="text-sm font-medium text-[var(--accent)] underline">
              Explore tvůrce
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
