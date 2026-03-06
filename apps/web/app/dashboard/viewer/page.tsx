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
    <Card className="overflow-hidden glass">
      <CardHeader className="border-b border-zinc-200/70 bg-gradient-to-r from-sky-500/10 via-[var(--accent)]/10 to-transparent dark:border-zinc-800">
        <CardTitle>Přehled diváka</CardTitle>
        <CardDescription>{profile?.display_name || profile?.username || user.email}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-5 dark:border-zinc-800/80 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">Aktivní členství</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-5 dark:border-zinc-800/80 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">Celkem členství</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{subscriptions?.length ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-5 dark:border-zinc-800/80 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">Rychlý vstup</p>
          <Link href="/explore" className="mt-2 inline-block text-sm font-medium text-[var(--accent)] underline">
            Projít tvůrce
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
