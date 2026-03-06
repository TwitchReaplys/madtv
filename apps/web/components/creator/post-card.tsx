import Link from "next/link";
import { Calendar, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Link href={`/c/${slug}/posts/${post.id}`} className="group block">
      <Card className="glass cursor-pointer transition-all duration-300 group-hover:border-[var(--accent)]/30">
        <CardHeader className="pb-3">
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
          <CardTitle className="mt-2 text-xl transition-colors group-hover:text-[var(--accent)]">
            {post.has_video ? <Play className="mr-2 inline h-4 w-4 text-[var(--accent)]" /> : null}
            {post.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {post.body_preview ? (
            <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{post.body_preview}</p>
          ) : (
            <p className="text-sm text-zinc-500">Příspěvek neobsahuje textový náhled.</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
