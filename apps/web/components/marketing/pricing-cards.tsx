import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    title: "Starter Creator",
    price: "0 Kč",
    note: "Build and test your page",
    features: ["Creator profile", "Public posts", "Stripe-ready tiers"],
  },
  {
    title: "Growth",
    price: "Your tier pricing",
    note: "Monetize with memberships",
    features: ["Members and tier gating", "Bunny video embeds", "Billing portal"],
    highlighted: true,
  },
  {
    title: "Scale",
    price: "Custom",
    note: "Extend with jobs and workers",
    features: ["BullMQ worker", "Event retries", "Optional metadata sync jobs"],
  },
];

export function PricingCards() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.title}
          className={plan.highlighted ? "border-[var(--accent)]/40 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]" : undefined}
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">{plan.title}</CardTitle>
              {plan.highlighted ? <Badge>Most popular</Badge> : null}
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{plan.price}</p>
            <CardDescription>{plan.note}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
