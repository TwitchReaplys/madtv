import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pro tvůrce | MadTV",
  description: "Nastav členství, publikuj videa a buduj komunitu. My řešíme přístup a platby.",
};

export default async function ForCreatorsPage() {
  let user: { id?: string } | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/90 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 sm:p-10">
        <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-[var(--accent)]/20 blur-3xl" />
        <div className="relative space-y-5">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Vydělávej na obsahu bez kompromisů.</h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Nastav členství, publikuj videa a buduj komunitu. My řešíme přístup a platby.
          </p>
          <Button asChild size="lg">
            <Link href={user ? "/dashboard" : "/login"}>Začít tvořit</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Členství během pár minut", "Vytvoř tier, nastav cenu a rovnou začni přijímat předplatné přes Stripe."],
          ["Video-first workflow", "Nahráváš přímo do Bunny Streamu a post je po publikaci hned dostupný členům."],
          ["Přístup hlídá databáze", "RLS v Postgresu řeší veřejný/members/tier obsah bez obcházení přes UI."],
        ].map(([title, description]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
