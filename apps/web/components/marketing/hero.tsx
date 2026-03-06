import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden rounded-3xl px-4 py-16 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--accent)]/10" />
      <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-[var(--accent)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-1/4 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 glass text-sm text-zinc-600 dark:text-zinc-300">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          Česko-slovenská komunita tvůrců
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl">
          Sleduj obsah,
          <br />
          <span className="text-gradient">který jinde není</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-xl">
          Podpoř své oblíbené tvůrce a odemkni bonusová videa, zákulisí i členské příspěvky. Členství zrušíš kdykoliv.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="glow px-8">
            <Link href="/explore">
              Procházet tvůrce
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link href="/login">Přihlásit se</Link>
          </Button>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8">
          {[
            { value: "1K+", label: "Tvůrců" },
            { value: "50K+", label: "Členů" },
            { value: "99 Kč", label: "Od / měsíc" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-gradient sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
