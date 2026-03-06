import { LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { PublicPostPreview } from "./post-card";

type LockedPostCardProps = {
  post: PublicPostPreview;
};

export function LockedPostCard({ post }: LockedPostCardProps) {
  return (
    <Card className="overflow-hidden border-dashed border-zinc-300/80 dark:border-zinc-700">
      {post.has_video ? (
        <div className="relative border-b border-zinc-200/80 dark:border-zinc-800">
          {post.video_thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.video_thumbnail_url} alt={`${post.title} video preview`} className="aspect-video w-full object-cover opacity-80" />
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
          )}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
              <LockKeyhole className="h-4 w-4" />
              Locked video
            </div>
          </div>
        </div>
      ) : null}
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl">{post.title}</CardTitle>
          <Badge>
            <LockKeyhole className="mr-1 h-3 w-3" />
            {post.visibility === "tier" && post.min_tier_rank
              ? `Tier ${post.min_tier_rank}+`
              : post.visibility === "members"
                ? "Members"
                : "Locked"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {post.body_preview || "This post is available for subscribed members."}
        </p>
      </CardContent>
      <CardFooter className="text-xs text-zinc-500">Subscribe to unlock full content.</CardFooter>
    </Card>
  );
}
