import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SubscribeCTAProps = {
  creatorSlug: string;
  hasMembership: boolean;
};

export function SubscribeCTA({ creatorSlug, hasMembership }: SubscribeCTAProps) {
  if (hasMembership) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 md:hidden">
      <Card className="flex items-center justify-between gap-3 border-none bg-transparent p-0 shadow-none">
        <div>
          <p className="text-sm font-semibold">Unlock members-only posts</p>
          <p className="text-xs text-zinc-500">Pick a tier and support this creator.</p>
        </div>
        <Button asChild size="sm">
          <Link href={`#tiers-${creatorSlug}`}>Subscribe</Link>
        </Button>
      </Card>
    </div>
  );
}
