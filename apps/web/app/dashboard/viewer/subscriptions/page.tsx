import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function ViewerSubscriptionsPage() {
  const { supabase, user } = await requireDashboardUser();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, creators ( slug, title ), tiers ( name, rank )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <Card className="overflow-hidden glass">
      <CardHeader className="border-b border-zinc-200/70 bg-gradient-to-r from-[var(--accent)]/10 via-sky-500/6 to-transparent dark:border-zinc-800">
        <CardTitle>Moje členství</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {(subscriptions ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Nemáš zatím žádné členství.{" "}
            <Link href="/explore" className="underline">
              Projdi tvůrce
            </Link>
            .
          </p>
        ) : (
          subscriptions?.map((subscription) => {
            const creatorRelation = subscription.creators as
              | { slug?: string; title?: string }
              | { slug?: string; title?: string }[]
              | null;
            const tierRelation = subscription.tiers as
              | { name?: string; rank?: number }
              | { name?: string; rank?: number }[]
              | null;

            const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
            const tier = Array.isArray(tierRelation) ? tierRelation[0] : tierRelation;

            return (
              <div key={subscription.id} className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950">
                <p className="font-medium">{creator?.title ?? "Creator"}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Stav: {subscription.status}
                  {tier?.name ? ` · ${tier.name}` : ""}
                </p>
                <p className="text-xs text-zinc-500">
                  Období do: {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleString() : "n/a"}
                </p>
                {creator?.slug ? (
                  <Link href={`/c/${creator.slug}`} className="mt-1 inline-block text-xs text-[var(--accent)] underline">
                    Otevřít profil tvůrce
                  </Link>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
