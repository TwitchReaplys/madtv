import { CreditCard, Lock, Sparkles, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Sparkles,
    title: "Exkluzivní obsah",
    description: "Bonusová videa, delší verze, zákulisí a obsah navíc jen pro členy.",
  },
  {
    icon: CreditCard,
    title: "Snadné členství",
    description: "Pár kliknutí a máš přístup k prémiovým příspěvkům. Platby běží přes Stripe.",
  },
  {
    icon: Lock,
    title: "Bezpečný přístup",
    description: "Přístup se řídí automaticky podle členství. Co je zamčené, zůstane zamčené.",
  },
  {
    icon: Users,
    title: "Blíž ke komunitě",
    description: "Komunikuj s tvůrci i ostatními členy a buď u všeho mezi prvními.",
  },
];

export function FeatureGrid() {
  return (
    <section className="space-y-8 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Proč se stát členem</h2>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">Získej víc obsahu a podpoř tvůrce, které opravdu sleduješ.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title} className="glass transition-all duration-300 hover:border-[var(--accent)]/30">
            <CardContent className="p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                <feature.icon className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
