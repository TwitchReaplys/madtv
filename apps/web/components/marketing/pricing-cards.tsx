import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    title: "Supporter",
    price: "od 99 Kč/měs",
    note: "Základní členský přístup",
    cta: "Vybrat Supporter",
    features: ["Členské textové příspěvky", "Komunitní komentáře", "Podpora tvůrce"],
  },
  {
    title: "Pro",
    price: "od 249 Kč/měs",
    note: "Více obsahu a early access",
    cta: "Vybrat Pro",
    features: ["Vše ze Supporter", "Exkluzivní videa", "Early access", "Prioritní reakce tvůrce"],
    highlighted: true,
  },
  {
    title: "VIP",
    price: "od 499 Kč/měs",
    note: "Maximální přístup",
    cta: "Vybrat VIP",
    features: ["Vše z Pro", "Behind the scenes", "Bonusové streamy", "Limitované drops"],
  },
];

export function PricingCards() {
  return (
    <section className="space-y-8 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Úrovně členství</h2>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">Každý tvůrce má vlastní ceny. Tohle je typický přehled.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.title}
            className={`relative flex h-full flex-col ${
              plan.highlighted ? "glow border-[var(--accent)]" : "glass"
            }`}
          >
            {plan.highlighted ? <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Nejoblíbenější</Badge> : null}
            <CardHeader>
              <CardTitle className="text-lg">{plan.title}</CardTitle>
              <p className="text-3xl font-bold">{plan.price}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{plan.note}</p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
