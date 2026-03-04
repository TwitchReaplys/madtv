import Link from "next/link";

import { BillingPortalButton } from "@/components/billing-portal-button";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const { supabase, user } = await requireUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, title")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, creators ( title, slug ), tiers ( name, rank )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Creator</h2>
        {creator ? (
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p>
              <span className="font-medium">{creator.title}</span> ({creator.slug})
            </p>
            <Link href={`/c/${creator.slug}`} className="inline-block rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100">
              Open public page
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-700">
            You do not have a creator profile yet. Create one in {" "}
            <Link href="/dashboard/creator" className="underline">
              Creator profile
            </Link>
            .
          </p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Your subscriptions</h2>
        <div className="mt-3 space-y-3 text-sm">
          {(subscriptions ?? []).length === 0 ? (
            <p className="text-zinc-700">No subscriptions found for your account.</p>
          ) : (
            subscriptions?.map((subscription) => {
              const creatorRelation = subscription.creators as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;
              const tierRelation = subscription.tiers as { name?: string; rank?: number } | { name?: string; rank?: number }[] | null;
              const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
              const tier = Array.isArray(tierRelation) ? tierRelation[0] : tierRelation;

              return (
                <article key={subscription.id} className="rounded-md border border-zinc-200 p-3">
                  <p className="font-medium">{creator?.title ?? "Creator"}</p>
                  <p className="text-zinc-700">
                    Status: {subscription.status}
                    {tier?.name ? ` · Tier: ${tier.name}` : ""}
                  </p>
                  <p className="text-zinc-500">
                    Current period end:{" "}
                    {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleString() : "n/a"}
                  </p>
                </article>
              );
            })
          )}
        </div>
        <div className="mt-4">
          <BillingPortalButton />
        </div>
      </section>
    </div>
  );
}
