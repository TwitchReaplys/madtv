import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SubscribeCTAProps = {
  creatorSlug: string;
  creatorName: string;
  lowestPrice?: string;
  hasMembership: boolean;
};

export function SubscribeCTA({ creatorSlug, creatorName, lowestPrice, hasMembership }: SubscribeCTAProps) {
  if (hasMembership) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/70 glass p-3 dark:border-zinc-800/80 md:hidden">
      <Card className="flex items-center justify-between gap-3 border-none bg-transparent p-0 shadow-none">
        <div className="text-sm">
          <p className="font-medium">Odebírat {creatorName}</p>
          <p className="text-zinc-500">od {lowestPrice ?? "99 Kč"}/měs</p>
        </div>
        <Button asChild size="sm" className="glow">
          <Link href={`#tiers-${creatorSlug}`}>
            <Lock className="h-4 w-4" />
            Odebírat
          </Link>
        </Button>
      </Card>
    </div>
  );
}
