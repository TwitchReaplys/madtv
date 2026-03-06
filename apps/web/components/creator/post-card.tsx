import Link from "next/link";
import { Calendar, Play } from "lucide-react";

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

const visibilityLabels: Record<PublicPostPreview["visibility"], string> = {
  public: "Veřejný",
  members: "Pro členy",
  tier: "Prémiový",
};

export function PostCard({ slug, post }: PostCardProps) {
  const date = new Date(post.published_at).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden glass transition-all duration-300 hover:border-[var(--accent)]/30">
      {post.has_video ? (
        <div className="relative border-b border-zinc-200/80 dark:border-zinc-800/80">
          {post.video_thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.video_thumbnail_url} alt={`${post.title} preview`} className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-100 text-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-sm font-medium shadow-sm dark:bg-zinc-900/90">
                <Play className="h-4 w-4" />
                Video
              </span>
            </div>
          )}
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
            Video
          </div>
        </div>
      ) : null}
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant={post.visibility === "public" ? "secondary" : "default"}>
            {visibilityLabels[post.visibility]}
            {post.visibility === "tier" && post.min_tier_rank ? ` ${post.min_tier_rank}+` : null}
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
      <CardContent className="space-y-3 pt-0">
        {post.body_preview ? (
          <p className="line-clamp-4 whitespace-pre-wrap text-base leading-7 text-zinc-700 dark:text-zinc-300">{post.body_preview}</p>
        ) : (
          <p className="text-sm text-zinc-500">Příspěvek neobsahuje textový náhled.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full sm:w-auto" size="sm">
          <Link href={`/c/${slug}/posts/${post.id}`}>Otevřít příspěvek</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
