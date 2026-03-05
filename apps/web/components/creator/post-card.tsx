import Link from "next/link";

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
};

type PostCardProps = {
  slug: string;
  post: PublicPostPreview;
};

export function PostCard({ slug, post }: PostCardProps) {
  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{post.title}</CardTitle>
          <Badge variant="secondary">
            {post.visibility}
            {post.visibility === "tier" && post.min_tier_rank ? ` ${post.min_tier_rank}+` : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {post.body_preview ? (
          <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">{post.body_preview}</p>
        ) : null}
        <p className="text-xs text-zinc-500">
          {new Date(post.published_at).toLocaleString()} · {post.has_video ? "Video" : "Text"}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" size="sm">
          <Link href={`/c/${slug}/posts/${post.id}`}>Open post</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
