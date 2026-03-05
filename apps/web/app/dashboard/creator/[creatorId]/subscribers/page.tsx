import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
};

export default async function CreatorSubscribersPage({ params }: PageProps) {
  const { creatorId } = await params;
  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, user_id, tier_id, profiles:user_id ( username, display_name ), tiers:tier_id ( name, rank )")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscribers · {creator.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(subscriptions ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">No subscribers yet.</p>
        ) : (
          subscriptions?.map((subscription) => {
            const profileRelation = subscription.profiles as
              | { username?: string; display_name?: string }
              | { username?: string; display_name?: string }[]
              | null;
            const tierRelation = subscription.tiers as
              | { name?: string; rank?: number }
              | { name?: string; rank?: number }[]
              | null;
            const profile = Array.isArray(profileRelation) ? profileRelation[0] : profileRelation;
            const tier = Array.isArray(tierRelation) ? tierRelation[0] : tierRelation;

            return (
              <div key={subscription.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="font-medium">{profile?.display_name || profile?.username || subscription.user_id}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Status: {subscription.status}
                  {tier?.name ? ` · ${tier.name}` : ""}
                </p>
                <p className="text-xs text-zinc-500">
                  Period end: {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleString() : "n/a"}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
