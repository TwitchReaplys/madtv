import { ArrowRight, Lock } from "lucide-react";

import { SubscribeButton } from "@/components/subscribe-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { PublicTier } from "./tier-cards";

type PaywallPanelProps = {
  tiers: PublicTier[];
  requiredRank: number;
  isAuthenticated: boolean;
  loginUrl: string;
};

export function PaywallPanel({ tiers, requiredRank, isAuthenticated, loginUrl }: PaywallPanelProps) {
  const relevantTiers = tiers.filter((tier) => tier.rank >= requiredRank).sort((a, b) => a.rank - b.rank);
  const cheapestTier = relevantTiers[0];

  return (
    <Card className="border-[var(--accent)]/30 glow">
      <CardContent className="space-y-6 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
            <Lock className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h3 className="text-xl font-bold">Tento obsah je zamčený</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Pro plný přístup potřebuješ předplatné s rankem <strong>{requiredRank}+</strong>.
          </p>
        </div>

        {relevantTiers.length > 0 ? (
          <div className="space-y-3">
            {relevantTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium">{tier.name}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {(tier.price_cents / 100).toLocaleString("cs-CZ")} {tier.currency} / měsíc
                  </p>
                  <Badge variant="outline" className="mt-1">
                    Rank {tier.rank}
                  </Badge>
                </div>
                <div className="min-w-44">
                  {isAuthenticated ? (
                    <SubscribeButton tierId={tier.id} />
                  ) : (
                    <Button asChild className="w-full">
                      <a href={loginUrl}>
                        Přihlásit se
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
            Pro tento příspěvek zatím není dostupný žádný odpovídající tier.
          </p>
        )}

        {cheapestTier && !isAuthenticated ? (
          <div className="text-center text-sm text-zinc-500">
            Nejnižší dostupná úroveň od {(cheapestTier.price_cents / 100).toLocaleString("cs-CZ")} {cheapestTier.currency}/měsíc
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
