import type { CSSProperties } from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createCommentAction } from "@/lib/actions/public";
import { PaywallPanel } from "@/components/creator/paywall-panel";
import type { PublicTier } from "@/components/creator/tier-cards";
import { Notice } from "@/components/notice";
import { VideoEmbed } from "@/components/video-embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DetailPreview = {
  post_id: string;
  creator_id: string;
  creator_slug: string;
  creator_title: string;
  accent_color: string;
  seo_description: string | null;
  title: string;
  body: string | null;
  body_preview: string | null;
  visibility: "public" | "members" | "tier";
  min_tier_rank: number | null;
  published_at: string;
  has_access: boolean;
};

type PostComment = {
  id: string;
  body: string;
  created_at: string;
  profiles:
    | {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }
    | {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

async function fetchDetailPreview(slug: string, id: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("creator_post_detail_preview", {
    p_creator_slug: slug,
    p_post_id: id,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as DetailPreview;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const detail = await fetchDetailPreview(slug, id);

  if (!detail) {
    return {
      title: "Post not found | MadTV",
    };
  }

  const description = detail.body_preview || detail.seo_description || `${detail.creator_title} on MadTV`;

  return {
    title: `${detail.title} | ${detail.creator_title}`,
    description,
    openGraph: {
      title: detail.title,
      description,
      type: "article",
    },
  };
}

function getMessage(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return typeof value === "string" ? value : null;
}

export default async function CreatorPostDetailPage({ params, searchParams }: PageProps) {
  const { slug, id } = await params;
  const query = await searchParams;

  const supabase = await createServerSupabaseClient();

  const [{ data: authUser }, detail] = await Promise.all([
    supabase.auth.getUser(),
    fetchDetailPreview(slug, id),
  ]);

  if (!detail) {
    notFound();
  }

  const creatorStyle = {
    "--accent": detail.accent_color || "#16a34a",
  } as CSSProperties;

  const isAuthenticated = Boolean(authUser.user);
  const requiredRank = detail.visibility === "tier" ? detail.min_tier_rank ?? 1 : 1;

  const [{ data: tiers }, { data: assets }, { data: comments }] = await Promise.all([
    supabase
      .from("tiers")
      .select("id, name, description, price_cents, currency, rank")
      .eq("creator_id", detail.creator_id)
      .eq("is_active", true)
      .order("rank", { ascending: true }),
    detail.has_access
      ? supabase.from("post_assets").select("id, type, bunny_video_id, bunny_library_id").eq("post_id", detail.post_id)
      : Promise.resolve({ data: [] as never[] }),
    detail.has_access
      ? supabase
          .from("comments")
          .select("id, body, created_at, profiles:user_id ( display_name, username, avatar_url )")
          .eq("post_id", detail.post_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  let activeRank = 0;
  let isCreatorAdmin = false;

  if (isAuthenticated) {
    const [{ data: rank }, { data: admin }] = await Promise.all([
      supabase.rpc("active_subscription_rank", {
        p_creator_id: detail.creator_id,
      }),
      supabase.rpc("is_creator_admin", {
        p_creator_id: detail.creator_id,
      }),
    ]);

    activeRank = Number(rank ?? 0);
    isCreatorAdmin = Boolean(admin);
  }

  const canComment = activeRank >= 1 || isCreatorAdmin;
  const hasVideo = (assets ?? []).some((asset) => asset.type === "bunny_video");

  const commentError = getMessage(query, "commentError");
  const commentSuccess = getMessage(query, "commentSuccess");

  return (
    <div className="space-y-6" style={creatorStyle}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/c/${slug}`} className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300">
          ← Zpět na profil tvůrce
        </Link>
        <Badge variant="secondary">
          {detail.visibility}
          {detail.visibility === "tier" && detail.min_tier_rank ? ` ${detail.min_tier_rank}+` : ""}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl tracking-tight">{detail.title}</CardTitle>
          <p className="text-xs text-zinc-500">Publikováno {new Date(detail.published_at).toLocaleString()}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {detail.has_access ? (
            <>
              {detail.body ? <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">{detail.body}</div> : null}
              <div className="space-y-4">
                {(assets ?? []).map((asset) => {
                  if (asset.type === "bunny_video" && asset.bunny_video_id && asset.bunny_library_id) {
                    return (
                      <VideoEmbed
                        key={asset.id}
                        libraryId={asset.bunny_library_id}
                        videoId={asset.bunny_video_id}
                        title={detail.title}
                        secure={Boolean(process.env.BUNNY_EMBED_TOKEN_KEY)}
                      />
                    );
                  }

                  return null;
                })}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {detail.body_preview ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">{detail.body_preview}</p>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Tento příspěvek je dostupný jen členům.</p>
              )}

              <PaywallPanel
                tiers={(tiers ?? []) as PublicTier[]}
                requiredRank={requiredRank}
                isAuthenticated={isAuthenticated}
                loginUrl={`/login?next=/c/${slug}/posts/${id}`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {detail.has_access ? (
        <section id="comments" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{hasVideo ? "Komentáře k videu" : "Komentáře"}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Sdílej feedback, otázky a reakce s komunitou.</p>
          </div>

          <Notice message={commentSuccess} variant="success" />
          <Notice message={commentError} variant="error" />

          {!isAuthenticated ? (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Pro přidání komentáře se přihlas do účtu.</p>
                <Button asChild size="sm">
                  <Link href={`/login?next=/c/${slug}/posts/${id}`}>Přihlásit se</Link>
                </Button>
              </CardContent>
            </Card>
          ) : !canComment ? (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Komentáře mohou psát aktivní členové tvůrce.</p>
                <Button asChild size="sm">
                  <Link href={`/c/${slug}#tiers-${slug}`}>Předplatit členství</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form action={createCommentAction} className="space-y-3">
                  <input type="hidden" name="postId" value={id} />
                  <input type="hidden" name="creatorSlug" value={slug} />
                  <Textarea name="body" rows={4} required placeholder="Napiš komentář..." />
                  <Button type="submit" size="sm">
                    Odeslat komentář
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {(comments as PostComment[] | null)?.length ? (
              (comments as PostComment[]).map((comment) => {
                const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
                const authorName = profile?.display_name || profile?.username || "Člen komunity";

                return (
                  <Card key={comment.id}>
                    <CardContent className="space-y-2 pt-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{authorName}</span>
                        <span>•</span>
                        <time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString()}</time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">{comment.body}</p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="pt-6 text-sm text-zinc-600 dark:text-zinc-300">
                  Zatím žádné komentáře. Buď první, kdo zareaguje.
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
