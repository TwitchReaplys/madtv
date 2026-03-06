import Link from "next/link";

import { ExploreCard, type ExploreCreator } from "@/components/creator/explore-card";
import { FAQ } from "@/components/marketing/faq";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let trendingCreators: ExploreCreator[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("creator_explore")
        .select("id, slug, title, tagline, avatar_url, accent_color, social_links, is_featured, active_members_count, starting_price_cents, currency")
        .order("is_featured", { ascending: false })
        .order("active_members_count", { ascending: false })
        .order("title", { ascending: true })
        .limit(8);

      trendingCreators = (data ?? []) as ExploreCreator[];
    } catch {
      trendingCreators = [];
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <Hero />
      <FeatureGrid />

      <section className="space-y-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tvůrci v trendu</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/explore">Zobrazit všechny</Link>
          </Button>
        </div>

        {trendingCreators.length === 0 ? (
          <Card className="glass">
            <CardContent className="pt-6 text-sm text-zinc-600 dark:text-zinc-300">
              Zatím tu nejsou žádní tvůrci. Mrkni později na nové profily.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trendingCreators.map((creator) => (
              <ExploreCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}
      </section>

      <FAQ />

      <footer className="border-t border-zinc-200/60 py-10 dark:border-zinc-800/70">
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-xl font-bold text-gradient">MadTV</p>
          <p className="text-sm text-zinc-500">© 2026 MadTV. Všechna práva vyhrazena.</p>
          <div className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-300">
            <Link href="/for-creators" className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-100">
              Pro tvůrce
            </Link>
            <Link href="/explore" className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-100">
              Ukázky
            </Link>
            <Link href="/login" className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-100">
              Přihlášení
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
