import { Calendar, Lock, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { PublicPostPreview } from "./post-card";

type LockedPostCardProps = {
  post: PublicPostPreview;
};

const tierNames: Record<number, string> = {
  1: "Supporter",
  2: "Pro",
  3: "VIP",
};

export function LockedPostCard({ post }: LockedPostCardProps) {
  const date = new Date(post.published_at).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="glass relative overflow-hidden">
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[var(--background)]/90 to-transparent" />
      <CardHeader className="relative z-20 pb-3">
        <div className="flex items-center justify-between">
          <Badge className="border border-[var(--accent)]/35 bg-[var(--accent)]/20 text-[var(--accent)]">
            <Lock className="mr-1 h-3 w-3" />
            {post.visibility === "tier" && post.min_tier_rank
              ? `${tierNames[post.min_tier_rank] || `Tier ${post.min_tier_rank}`}+`
              : "Pro členy"}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            {date}
          </span>
        </div>
        <CardTitle className="mt-2 text-xl">
          {post.has_video ? <Play className="mr-2 inline h-4 w-4 text-[var(--accent)]" /> : null}
          {post.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-20">
        <div className="mb-3 h-12 rounded-md bg-zinc-300/25 blur-sm dark:bg-zinc-700/25" />
        <div className="h-8 w-3/4 rounded-md bg-zinc-300/20 blur-sm dark:bg-zinc-700/20" />
        <Button className="mt-4 w-full" size="sm">
          <Lock className="mr-2 h-4 w-4" />
          Odemknout – odebírat{" "}
          {post.visibility === "tier" && post.min_tier_rank
            ? tierNames[post.min_tier_rank] || `Tier ${post.min_tier_rank}`
            : ""}
        </Button>
      </CardContent>
    </Card>
  );
}
