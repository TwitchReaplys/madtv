import { Lock, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: ShieldCheck,
    title: "Database-enforced access",
    description: "Post visibility is enforced in SQL policies via RLS helper functions.",
  },
  {
    icon: PlayCircle,
    title: "Video uploads that scale",
    description: "Client uploads directly to Bunny Stream over TUS, keeping your server lean.",
  },
  {
    icon: Lock,
    title: "Secure billing lifecycle",
    description: "Checkout, portal and idempotent Stripe webhook processing with background jobs.",
  },
  {
    icon: Sparkles,
    title: "Creator microsites",
    description: "Branded public pages with accent color, tier cards, locked teasers, and paywalls.",
  },
];

export function FeatureGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {features.map((feature) => (
        <Card key={feature.title} className="transition-transform duration-200 hover:-translate-y-0.5">
          <CardHeader>
            <feature.icon className="h-5 w-5 text-[var(--accent)]" />
            <CardTitle className="mt-3 text-lg">{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
    </section>
  );
}
