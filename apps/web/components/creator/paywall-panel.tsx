import { Lock } from "lucide-react";

import { SubscribeButton } from "@/components/subscribe-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { PublicTier } from "./tier-cards";

type PaywallPanelProps = {
  tiers: PublicTier[];
  requiredRank: number;
  isAuthenticated: boolean;
  loginUrl: string;
};

export function PaywallPanel({ tiers, requiredRank, isAuthenticated, loginUrl }: PaywallPanelProps) {
  const relevantTiers = tiers.filter((tier) => tier.rank >= requiredRank).sort((a, b) => a.rank - b.rank);

  return (
    <Card className="border-[var(--accent)]/35 bg-[var(--accent)]/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-[var(--accent)]" />
          <CardTitle className="text-xl">Members-only content</CardTitle>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          This post is locked. Subscribe to a tier with rank {requiredRank}+ to unlock full access.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {relevantTiers.map((tier) => (
          <div key={tier.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <p className="font-medium">{tier.name}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {(tier.price_cents / 100).toFixed(2)} {tier.currency} / month
              </p>
              <Badge variant="outline" className="mt-1">
                Rank {tier.rank}
              </Badge>
            </div>

            <div>
              {isAuthenticated ? (
                <SubscribeButton tierId={tier.id} />
              ) : (
                <a href={loginUrl} className="text-sm font-medium text-[var(--accent)] underline">
                  Login to subscribe
                </a>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
