import Link from "next/link";

import { ExploreCard, type ExploreCreator } from "@/components/creator/explore-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const memberBenefits = [
  {
    title: "Bonusová videa",
    description: "Epizody navíc, behind-the-scenes, delší verze.",
  },
  {
    title: "Komunita",
    description: "Komentáře, reakce, pocit, že jsi u toho.",
  },
  {
    title: "Podpora tvůrců",
    description: "Přímo — bez reklamních kompromisů.",
  },
];

const howItWorks = [
  {
    title: "1. Vyber si tvůrce",
    description: "Projdi profily, porovnej výhody a najdi obsah, který tě baví.",
  },
  {
    title: "2. Aktivuj členství",
    description: "Přihlásíš se, zvolíš tier a platbu potvrdíš během chvíle.",
  },
  {
    title: "3. Odemkni obsah navíc",
    description: "Získáš videa, bonusy a přístup do komunity. Zrušíš kdykoli.",
  },
];

const faqItems = [
  {
    question: "Můžu členství kdykoli zrušit?",
    answer: "Ano. Zrušení je otázka pár kliknutí v zákaznickém portálu.",
  },
  {
    question: "Jak funguje účtování?",
    answer: "Platby běží měsíčně přes Stripe. Datum další platby vidíš ve svém účtu.",
  },
  {
    question: "Co když nebudu spokojený?",
    answer: "Můžeš členství ukončit před dalším obdobím a nic dalšího se nestrhne.",
  },
];

export default async function HomePage() {
  let trendingCreators: ExploreCreator[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("creator_explore")
        .select("id, slug, title, tagline, avatar_url, accent_color, social_links, active_members_count, starting_price_cents, currency")
        .order("active_members_count", { ascending: false })
        .order("title", { ascending: true })
        .limit(8);

      trendingCreators = (data ?? []) as ExploreCreator[];
    } catch {
      trendingCreators = [];
    }
  }

  return (
    <div className="space-y-14 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/90 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--accent)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative space-y-6">
          <p className="inline-flex rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[var(--accent)]">
            Podpoř své oblíbené tvůrce
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Obsah navíc. Blíž k tvůrcům.</h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Předplať si členství a odemkni videa, bonusy a komunitu. Zrušíš kdykoli.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/explore">Procházet tvůrce</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Přihlásit se</Link>
            </Button>
          </div>
          <p className="text-sm text-zinc-500">Bez závazků • Zrušení na 2 kliknutí • Bezpečné platby</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Co získáš jako člen</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {memberBenefits.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="jak-to-funguje" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Jak to funguje</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {howItWorks.map((item) => (
            <Card key={item.title} className="border-zinc-200/80 dark:border-zinc-800/80">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Aktuálně nejvíc sledované</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/explore">Zobrazit všechny</Link>
          </Button>
        </div>

        {trendingCreators.length === 0 ? (
          <Card>
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

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {faqItems.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-base">{item.question}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
