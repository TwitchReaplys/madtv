import type { CSSProperties } from "react";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { CreatorHeader } from "@/components/creator/creator-header";
import { FeaturedMediaCard } from "@/components/creator/featured-media-card";
import { LockedPostCard } from "@/components/creator/locked-post-card";
import { PostCard } from "@/components/creator/post-card";
import { SubscribeCTA } from "@/components/creator/subscribe-cta";
import { TierCards, type PublicTier } from "@/components/creator/tier-cards";
import { Notice } from "@/components/notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getCreatorBySlug(slug: string) {
  const supabase = await createServerSupabaseClient();

  return supabase
    .from("creators")
    .select(
      "id, slug, title, tagline, about, owner_user_id, accent_color, cover_image_url, avatar_url, seo_description, social_links, featured_media_type, featured_video_id, featured_thumbnail_url, featured_image_url",
    )
    .eq("slug", slug)
    .maybeSingle();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const { data: creator } = await getCreatorBySlug(slug);

  if (!creator) {
    return {
      title: "Creator not found | MadTV",
    };
  }

  const description = creator.seo_description || creator.tagline || creator.about || `${creator.title} on MadTV`;

  return {
    title: `${creator.title} | MadTV`,
    description,
    openGraph: {
      title: creator.title,
      description,
      type: "profile",
      images: creator.cover_image_url ? [creator.cover_image_url] : undefined,
    },
  };
}

export default async function CreatorPublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const checkoutSuccess = query.checkout === "success" ? "Subscription completed. Access should be available shortly." : null;
  const checkoutCancel = query.checkout === "cancel" ? "Checkout was canceled." : null;

  const supabase = await createServerSupabaseClient();
  const cookieStore = await cookies();
  const { user } = await getAuthUser(supabase, cookieStore.getAll());

  const { data: creator, error: creatorError } = await getCreatorBySlug(slug);

  if (creatorError || !creator) {
    notFound();
  }

  const [{ data: tiers }, { data: previewRows }, { data: memberRank }] = await Promise.all([
    supabase
      .from("tiers")
      .select("id, name, description, price_cents, currency, rank")
      .eq("creator_id", creator.id)
      .eq("is_active", true)
      .order("rank", { ascending: true }),
    supabase.rpc("creator_post_previews", {
      p_creator_id: creator.id,
    }),
    supabase.rpc("active_subscription_rank", {
      p_creator_id: creator.id,
    }),
  ]);

  const isOwner = user?.id === creator.owner_user_id;
  const activeRank = Number(memberRank ?? 0);
  const hasMembership = activeRank >= 1;

  const posts = (previewRows ?? []) as Array<{
    id: string;
    title: string;
    body_preview: string | null;
    visibility: "public" | "members" | "tier";
    min_tier_rank: number | null;
    published_at: string;
    has_access: boolean;
    has_video: boolean;
  }>;

  const socialLinks =
    creator.social_links && typeof creator.social_links === "object" && !Array.isArray(creator.social_links)
      ? (creator.social_links as {
          instagram?: string;
          tiktok?: string;
          youtube?: string;
          website?: string;
        })
      : null;

  const creatorStyle = {
    "--accent": creator.accent_color || "#16a34a",
  } as CSSProperties;

  return (
    <div className="space-y-8" style={creatorStyle}>
      <CreatorHeader
        slug={creator.slug}
        title={creator.title}
        tagline={creator.tagline}
        about={creator.about}
        coverImageUrl={creator.cover_image_url}
        avatarUrl={creator.avatar_url}
        socialLinks={socialLinks}
        ownerView={isOwner}
      />

      <FeaturedMediaCard
        creatorId={creator.id}
        creatorTitle={creator.title}
        mediaType={
          creator.featured_media_type === "bunny_video" || creator.featured_media_type === "image"
            ? creator.featured_media_type
            : "none"
        }
        featuredVideoId={creator.featured_video_id}
        featuredThumbnailUrl={creator.featured_thumbnail_url}
        featuredImageUrl={creator.featured_image_url}
        coverImageUrl={creator.cover_image_url}
        libraryId={process.env.BUNNY_STREAM_LIBRARY_ID ?? ""}
      />

      <div className="space-y-3">
        <Notice message={checkoutSuccess} variant="success" />
        <Notice message={checkoutCancel} variant="error" />
      </div>

      <section id={`tiers-${creator.slug}`} className="space-y-4 scroll-mt-20">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Membership tiers</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Choose your access level and unlock premium posts.</p>
        </div>
        <TierCards tiers={(tiers ?? []) as PublicTier[]} isAuthenticated={Boolean(user)} loginUrl={`/login?next=/c/${creator.slug}`} />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Latest posts</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Public posts are open. Members-only posts include preview teasers.
          </p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No posts yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-300">
              This creator has not published any posts yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {posts.map((post) =>
              post.has_access ? <PostCard key={post.id} slug={creator.slug} post={post} /> : <LockedPostCard key={post.id} post={post} />,
            )}
          </div>
        )}
      </section>

      <SubscribeCTA creatorSlug={creator.slug} hasMembership={hasMembership || isOwner} />
    </div>
  );
}
