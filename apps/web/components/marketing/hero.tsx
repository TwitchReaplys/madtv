import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/90 p-8 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 sm:p-12">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--accent)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative space-y-6">
        <p className="inline-flex rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Membership platform MVP
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          Build your creator community. Publish once, monetize monthly, keep control.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
          MadTV combines Next.js, Supabase RLS, Stripe Subscriptions, and Bunny Stream into a conversion-first
          platform for serious creators.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Start as creator</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["RLS-first", "Access control in Postgres, not only UI"],
            ["Subscriptions", "Stripe Checkout + Billing Portal + Webhooks"],
            ["Video-native", "Direct Bunny TUS upload with secure embeds"],
          ].map(([title, text]) => (
            <Card key={title} className="p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
