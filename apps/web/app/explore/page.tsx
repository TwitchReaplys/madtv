import type { Metadata } from "next";
import Link from "next/link";

import { ExploreCard, type ExploreCreator } from "@/components/creator/explore-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Explore tvůrce | MadTV",
  description: "Vyber si členství podle stylu a výhod.",
};

function getSearchValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const queryValue = getSearchValue(params.q);
  let creatorsRaw: (ExploreCreator & { about?: string | null })[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("creator_explore")
        .select("id, slug, title, tagline, about, avatar_url, accent_color, social_links, is_featured, active_members_count, starting_price_cents, currency")
        .order("is_featured", { ascending: false })
        .order("active_members_count", { ascending: false })
        .order("title", { ascending: true });

      creatorsRaw = (data ?? []) as (ExploreCreator & { about?: string | null })[];
    } catch {
      creatorsRaw = [];
    }
  }

  const normalizedQuery = queryValue.toLocaleLowerCase("cs");
  const filteredCreators = normalizedQuery
    ? creatorsRaw.filter((creator) =>
        [creator.title, creator.tagline, creator.about, creator.slug]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLocaleLowerCase("cs").includes(normalizedQuery)),
      )
    : creatorsRaw;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Explore tvůrce</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Vyber si členství podle stylu a výhod.
        </p>
      </section>

      <form action="/explore" className="flex flex-col gap-3 sm:flex-row">
        <Input
          name="q"
          defaultValue={queryValue}
          placeholder="Hledej podle jména, tématu nebo tagu…"
          className="h-11"
        />
        <Button type="submit" size="lg">
          Hledat
        </Button>
      </form>

      {filteredCreators.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-lg font-semibold">Nic jsme nenašli</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Zkus upravit hledání nebo vybrat jinou kategorii.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/explore">Vymazat filtry</Link>
          </Button>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCreators.map((creator) => (
            <ExploreCard key={creator.id} creator={creator} />
          ))}
        </section>
      )}
    </div>
  );
}
