import type { CSSProperties } from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaywallPanel } from "@/components/creator/paywall-panel";
import type { PublicTier } from "@/components/creator/tier-cards";
import { VideoEmbed } from "@/components/video-embed";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
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

export default async function CreatorPostDetailPage({ params }: PageProps) {
  const { slug, id } = await params;

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

  const [{ data: tiers }, { data: assets }] = await Promise.all([
    supabase
      .from("tiers")
      .select("id, name, description, price_cents, currency, rank")
      .eq("creator_id", detail.creator_id)
      .eq("is_active", true)
      .order("rank", { ascending: true }),
    detail.has_access
      ? supabase
          .from("post_assets")
          .select("id, type, bunny_video_id, bunny_library_id")
          .eq("post_id", detail.post_id)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const requiredRank = detail.visibility === "tier" ? detail.min_tier_rank ?? 1 : 1;

  return (
    <div className="space-y-6" style={creatorStyle}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/c/${slug}`} className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300">
          ← Back to creator page
        </Link>
        <Badge variant="secondary">
          {detail.visibility}
          {detail.visibility === "tier" && detail.min_tier_rank ? ` ${detail.min_tier_rank}+` : ""}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl tracking-tight">{detail.title}</CardTitle>
          <p className="text-xs text-zinc-500">Published {new Date(detail.published_at).toLocaleString()}</p>
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
                <p className="text-sm text-zinc-600 dark:text-zinc-300">This post is available for members.</p>
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
    </div>
  );
}
