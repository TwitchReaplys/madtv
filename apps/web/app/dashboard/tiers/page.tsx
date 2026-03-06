import Link from "next/link";
import { Notice } from "@/components/notice";
import { createTierAction, deleteTierAction, toggleTierAction } from "@/lib/actions/dashboard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatTierPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

export default async function DashboardTiersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { supabase, user } = await requireUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, title, pricing_mode")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return (
      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">Tiery</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Nejdřív je potřeba creator profil. Otevři{" "}
          <Link href="/dashboard/creator" className="underline">
            Creator profil
          </Link>
          .
        </p>
      </section>
    );
  }

  const { data: tiers } = await supabase
    .from("tiers")
    .select("id, name, description, price_cents, currency, rank, is_active, stripe_price_id, created_at")
    .eq("creator_id", creator.id)
    .order("rank", { ascending: true });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">Nový plán / cena</h2>
        <p className="mt-2 text-sm text-zinc-600">Při vytvoření se automaticky založí Stripe Product + Price.</p>

        <div className="mt-4 space-y-3">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />
        </div>

        <form action={createTierAction} className="mt-4 space-y-4">
          <input type="hidden" name="creatorId" value={creator.id} />

          <div>
            <label className="mb-1 block text-sm font-medium">Model členství</label>
            <select
              name="pricingMode"
              defaultValue={creator.pricing_mode === "single" ? "single" : "tiers"}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="single">Jednotná cena (jeden plán)</option>
              <option value="tiers">Tiery (více plánů)</option>
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              U jednotné ceny se po vytvoření tohoto plánu automaticky deaktivují ostatní aktivní tiery.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Název</label>
            <input name="name" type="text" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Popis</label>
            <textarea name="description" rows={3} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Cena (CZK / měsíc)</label>
              <input
                name="priceCents"
                type="text"
                required
                defaultValue="199,00"
                inputMode="decimal"
                placeholder="199,00"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500">Použij formát 199 nebo 199,00.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Měna</label>
              <input
                name="currency"
                type="text"
                required
                defaultValue="CZK"
                maxLength={3}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rank</label>
              <input
                name="rank"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={1}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button type="submit" className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
            Vytvořit tier
          </button>
        </form>
      </section>

      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">Existující tiery</h2>
        <div className="mt-4 space-y-3">
          {(tiers ?? []).length === 0 ? (
            <p className="text-sm text-zinc-700">Zatím žádné tiery.</p>
          ) : (
            tiers?.map((tier) => (
              <article key={tier.id} className="rounded-md border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{tier.name}</h3>
                    <p className="text-sm text-zinc-700">Rank {tier.rank} · {formatTierPrice(tier.price_cents, tier.currency)}</p>
                    {tier.description ? <p className="mt-1 text-sm text-zinc-600">{tier.description}</p> : null}
                    <p className="mt-1 text-xs text-zinc-500">Stripe price: {tier.stripe_price_id ?? "n/a"}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      tier.is_active ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {tier.is_active ? "Aktivní" : "Neaktivní"}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <form action={toggleTierAction}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <input type="hidden" name="isActive" value={tier.is_active ? "false" : "true"} />
                    <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100">
                      {tier.is_active ? "Deaktivovat" : "Aktivovat"}
                    </button>
                  </form>

                  <form action={deleteTierAction}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <button type="submit" className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
                      Smazat
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
