import { SubscribeButton } from "@/components/subscribe-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <Card>
        <CardContent className="pt-6 text-sm text-zinc-600 dark:text-zinc-300">No active tiers yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tiers.map((tier) => (
        <Card key={tier.id} className="transition-transform duration-200 hover:-translate-y-0.5">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">{tier.name}</CardTitle>
              <Badge variant="outline">Rank {tier.rank}</Badge>
            </div>
            <p className="text-2xl font-bold">
              {(tier.price_cents / 100).toFixed(2)} {tier.currency}
              <span className="text-sm font-medium text-zinc-500"> / month</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {tier.description ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{tier.description}</p> : null}
            {isAuthenticated ? (
              <SubscribeButton tierId={tier.id} />
            ) : (
              <Button asChild variant="outline" className="w-full">
                <a href={loginUrl}>Login to subscribe</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
