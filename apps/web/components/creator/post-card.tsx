import Link from "next/link";
import { PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export type PublicPostPreview = {
  id: string;
  title: string;
  body_preview: string | null;
  visibility: "public" | "members" | "tier";
  min_tier_rank: number | null;
  published_at: string;
  has_access: boolean;
  has_video: boolean;
  video_thumbnail_url?: string | null;
};

type PostCardProps = {
  slug: string;
  post: PublicPostPreview;
};

export function PostCard({ slug, post }: PostCardProps) {
  return (
    <Card className="overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      {post.has_video ? (
        <div className="relative border-b border-zinc-200/80 dark:border-zinc-800">
          {post.video_thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.video_thumbnail_url} alt={`${post.title} preview`} className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-100 text-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-sm font-medium shadow-sm dark:bg-zinc-900/90">
                <PlayCircle className="h-4 w-4" />
                Video post
              </span>
            </div>
          )}
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
            Video
          </div>
        </div>
      ) : null}
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl">{post.title}</CardTitle>
          <Badge variant="secondary">
            {post.visibility}
            {post.visibility === "tier" && post.min_tier_rank ? ` ${post.min_tier_rank}+` : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {post.body_preview ? (
          <p className="line-clamp-5 whitespace-pre-wrap text-base leading-7 text-zinc-700 dark:text-zinc-300">{post.body_preview}</p>
        ) : null}
        <p className="text-xs text-zinc-500">
          {new Date(post.published_at).toLocaleString()} · {post.has_video ? "Video" : "Text"}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full sm:w-auto" size="sm">
          <Link href={`/c/${slug}/posts/${post.id}`}>Open post</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
