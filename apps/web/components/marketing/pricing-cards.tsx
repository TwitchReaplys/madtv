import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    title: "Starter",
    price: "Zdarma",
    note: "Pro začínající tvůrce",
    cta: "Začít zdarma",
    features: ["1 tier", "Základní analýzy", "Text posty", "E-mail podpora"],
  },
  {
    title: "Creator",
    price: "299 Kč/měs",
    note: "Pro aktivní tvůrce",
    cta: "Vybrat Creator",
    features: ["Neomezené tiery", "Pokročilé analýzy", "Video hosting", "Vlastní branding", "Prioritní podpora"],
    highlighted: true,
  },
  {
    title: "Business",
    price: "799 Kč/měs",
    note: "Pro profesionální tvůrce",
    cta: "Vybrat Business",
    features: ["Vše z Creator", "API přístup", "Týmové účty", "Webhooks", "Dedikovaný support"],
  },
];

export function PricingCards() {
  return (
    <section className="space-y-8 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Jednoduchý ceník</h2>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">Zvol si plán, který ti vyhovuje. Bez skrytých poplatků.</p>
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
