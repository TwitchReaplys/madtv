import Link from "next/link";
import { Calendar, Eye, Pencil, Play } from "lucide-react";

import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePostAction } from "@/lib/actions/dashboard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PostAssetRow = {
  id: string;
  type: string | null;
};

type PostRow = {
  id: string;
  title: string;
  visibility: "public" | "members" | "tier";
  min_tier_rank: number | null;
  published_at: string;
  post_assets: PostAssetRow[] | PostAssetRow | null;
};

const visibilityLabel = {
  public: "Veřejný",
  members: "Pro členy",
  tier: "Prémiový",
} as const;

export default async function DashboardPostsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { supabase, user } = await requireUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, title")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return (
      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>Příspěvky</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nejdřív vytvoř creator profil, potom můžeš publikovat příspěvky.
        </CardContent>
      </Card>
    );
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, visibility, min_tier_rank, published_at, post_assets ( id, type )")
    .eq("creator_id", creator.id)
    .order("published_at", { ascending: false });

  const typedPosts = (posts ?? []) as PostRow[];

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Příspěvky</h1>
        <Button asChild className="glow">
          <Link href="/dashboard/posts/new">Nový příspěvek</Link>
        </Button>
      </div>

      <Notice message={success} variant="success" />
      <Notice message={error} variant="error" />

      <div className="space-y-3">
        {typedPosts.length === 0 ? (
          <Card className="glass">
            <CardContent className="pt-6 text-sm text-muted-foreground">Zatím žádné příspěvky.</CardContent>
          </Card>
        ) : (
          typedPosts.map((post) => {
            const assets = Array.isArray(post.post_assets) ? post.post_assets : [];
            const hasVideo = assets.some((asset) => asset.type === "bunny_video");

            return (
              <Card key={post.id} className="glass">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{post.title}</h3>
                      <Badge variant={post.visibility === "public" ? "secondary" : "default"} className="text-xs">
                        {visibilityLabel[post.visibility]}
                        {post.visibility === "tier" && post.min_tier_rank ? ` ${post.min_tier_rank}+` : null}
                      </Badge>
                      {hasVideo ? (
                        <Badge variant="outline" className="text-xs">
                          <Play className="h-3 w-3" />
                          Video
                        </Badge>
                      ) : null}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.published_at).toLocaleString("cs-CZ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/c/${creator.slug}/posts/${post.id}`} aria-label="Náhled">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/dashboard/creator/${creator.id}/posts/${post.id}/edit`} aria-label="Upravit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>

                    <form action={deletePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="returnPath" value="/dashboard/posts" />
                      <Button type="submit" variant="destructive" size="sm">
                        Smazat
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
