import { CreditCard, Shield, Users, Video } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Video,
    title: "Video obsah",
    description: "Nahrávej videa přímo na platformu. Rychlý streaming s globální CDN.",
  },
  {
    icon: CreditCard,
    title: "Jednoduché platby",
    description: "Předplatné přes Stripe. Automatická fakturace a správa zákazníků.",
  },
  {
    icon: Shield,
    title: "Bezpečný přístup",
    description: "Obsah chráněný na úrovni databáze. Žádné obcházení paywallu.",
  },
  {
    icon: Users,
    title: "Komunita",
    description: "Buduj komunitu kolem obsahu. Tiery pro různé úrovně přístupu.",
  },
];

export function FeatureGrid() {
  return (
    <section className="space-y-8 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Vše co potřebuješ</h2>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">Kompletní sada nástrojů pro moderní tvůrce obsahu.</p>
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
