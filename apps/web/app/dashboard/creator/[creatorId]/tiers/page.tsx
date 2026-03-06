import { Notice } from "@/components/notice";
import { createTierAction, deleteTierAction, toggleTierAction } from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorTiersPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const { data: tiers } = await supabase
    .from("tiers")
    .select("id, name, description, price_cents, currency, rank, is_active, stripe_price_id, created_at")
    .eq("creator_id", creatorId)
    .order("rank", { ascending: true });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">New tier for {creator.title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Stripe Product + Price will be created automatically.</p>

        <div className="mt-4 space-y-3">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />
        </div>

        <form action={createTierAction} className="mt-4 space-y-4">
          <input type="hidden" name="creatorId" value={creatorId} />
          <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/tiers`} />

          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input name="name" type="text" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea name="description" rows={3} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Price (cents)</label>
              <input name="priceCents" type="number" min={100} step={1} required defaultValue={199} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Currency</label>
              <input name="currency" type="text" required defaultValue="CZK" maxLength={3} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rank</label>
              <input name="rank" type="number" min={1} step={1} required defaultValue={1} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
          </div>

          <button type="submit" className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            Create tier
          </button>
        </form>
      </section>

      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">Existing tiers</h2>
        <div className="mt-4 space-y-3">
          {(tiers ?? []).length === 0 ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">No tiers yet.</p>
          ) : (
            tiers?.map((tier) => (
              <article key={tier.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{tier.name}</h3>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      Rank {tier.rank} · {(tier.price_cents / 100).toFixed(2)} {tier.currency}
                    </p>
                    {tier.description ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{tier.description}</p> : null}
                    <p className="mt-1 text-xs text-zinc-500">Stripe price: {tier.stripe_price_id ?? "n/a"}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      tier.is_active
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {tier.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <form action={toggleTierAction}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <input type="hidden" name="isActive" value={tier.is_active ? "false" : "true"} />
                    <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/tiers`} />
                    <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                      {tier.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </form>

                  <form action={deleteTierAction}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/tiers`} />
                    <button type="submit" className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
