import { LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { PublicPostPreview } from "./post-card";

type LockedPostCardProps = {
  post: PublicPostPreview;
};

export function LockedPostCard({ post }: LockedPostCardProps) {
  return (
    <Card className="border-dashed border-zinc-300/80 dark:border-zinc-700">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{post.title}</CardTitle>
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
