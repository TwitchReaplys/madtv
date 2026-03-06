import { SubscribeButton } from "@/components/subscribe-button";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export type PublicTier = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  rank: number;
};

type TierCardsProps = {
  tiers: PublicTier[];
  isAuthenticated: boolean;
  loginUrl: string;
};

export function TierCards({ tiers, isAuthenticated, loginUrl }: TierCardsProps) {
  if (tiers.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="pt-6 text-sm text-zinc-600 dark:text-zinc-300">Tento tvůrce zatím nemá aktivní tiery.</CardContent>
      </Card>
    );
  }

  const featureByRank: Record<number, string[]> = {
    1: ["Přístup k členským příspěvkům", "Komunitní diskuze", "E-mail notifikace"],
    2: ["Vše ze Supporter", "Exkluzivní videa", "Early access k obsahu", "Prioritní odpovědi"],
    3: ["Vše z Pro", "Privátní obsah", "Behind the scenes", "Měsíční bonus"],
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map((tier) => (
        <Card
          key={tier.id}
          className={`relative flex h-full flex-col ${tier.rank === 2 ? "border-[var(--accent)] glow" : "glass"}`}
        >
          {tier.rank === 2 ? <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Nejoblíbenější</Badge> : null}

          <CardHeader className="text-center">
            <CardTitle className="text-lg">{tier.name}</CardTitle>
            <p className="text-3xl font-bold">
              {(tier.price_cents / 100).toLocaleString("cs-CZ")} {tier.currency}
            </p>
            <p className="text-xs text-zinc-500">/ měsíc</p>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {tier.description ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{tier.description}</p> : null}
            <ul className="space-y-3">
              {(featureByRank[tier.rank] ?? ["Přístup k obsahu dle tieru"]).map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-0">
            {isAuthenticated ? (
              <SubscribeButton tierId={tier.id} />
            ) : (
              <Button asChild variant="outline" className="w-full">
                <a href={loginUrl}>Přihlásit a odebírat</a>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
