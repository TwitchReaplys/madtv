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
      {post.has_video ? (
        <div className="relative border-b border-zinc-200/80 dark:border-zinc-800/80">
          {post.video_thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.video_thumbnail_url} alt={`${post.title} preview`} className="aspect-video w-full object-cover opacity-70" />
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
          )}
          <div className="absolute inset-0 bg-zinc-950/30" />
        </div>
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/92 via-[var(--background)]/45 to-transparent" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <Badge className="bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/35">
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
      <CardContent className="relative z-10 pt-0">
        <div className="mb-3 h-10 rounded-md bg-zinc-300/30 blur-[1px] dark:bg-zinc-700/25" />
        <div className="h-8 w-3/4 rounded-md bg-zinc-300/20 blur-[1px] dark:bg-zinc-700/20" />
        <Button className="mt-4 w-full" size="sm">
          <Lock className="h-4 w-4" />
          Odemknout příspěvek
        </Button>
      </CardContent>
    </Card>
  );
}
