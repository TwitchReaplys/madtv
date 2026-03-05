import Link from "next/link";

import { BillingPortalButton } from "@/components/billing-portal-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const { supabase, user } = await requireUser();

  const [{ data: creator }, { data: subscriptions }, { count: postsCount }] = await Promise.all([
    supabase
      .from("creators")
      .select("id, slug, title")
      .eq("owner_user_id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id, status, current_period_end, creators ( title, slug ), tiers ( name, rank )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_user_id", user.id),
  ]);

  const { count: tiersCount } = creator
    ? await supabase.from("tiers").select("id", { count: "exact", head: true }).eq("creator_id", creator.id)
    : { count: 0 };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creator status</CardTitle>
            <CardDescription>{creator ? "Profile configured" : "No creator profile yet"}</CardDescription>
          </CardHeader>
          <CardContent>
            {creator ? <Badge>@{creator.slug}</Badge> : <Badge variant="outline">Setup required</Badge>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Published posts</CardTitle>
            <CardDescription>Your creator content count</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{postsCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active tiers</CardTitle>
            <CardDescription>Membership offers configured</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tiersCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="creator">
            <TabsList>
              <TabsTrigger value="creator">Creator</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="creator" className="space-y-3 pt-3">
              {creator ? (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium">{creator.title}</span> ({creator.slug})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/c/${creator.slug}`}>Open public page</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/dashboard/creator">Edit creator profile</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Create a profile in the Creator tab first.</p>
              )}
            </TabsContent>

            <TabsContent value="billing" className="space-y-3 pt-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Open Stripe customer portal to manage subscriptions and payment methods.
              </p>
              <BillingPortalButton />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(subscriptions ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">No subscriptions found.</p>
          ) : (
            subscriptions?.map((subscription) => {
              const creatorRelation = subscription.creators as
                | { title?: string; slug?: string }
                | { title?: string; slug?: string }[]
                | null;
              const tierRelation = subscription.tiers as
                | { name?: string; rank?: number }
                | { name?: string; rank?: number }[]
                | null;

              const creatorData = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
              const tierData = Array.isArray(tierRelation) ? tierRelation[0] : tierRelation;

              return (
                <div key={subscription.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="font-medium">{creatorData?.title ?? "Creator"}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Status: {subscription.status}
                    {tierData?.name ? ` · Tier: ${tierData.name}` : ""}
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
    </div>
  );
}
