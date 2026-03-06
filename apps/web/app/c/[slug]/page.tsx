import type { CSSProperties } from "react";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

import { CreatorHeader } from "@/components/creator/creator-header";
import { LockedPostCard } from "@/components/creator/locked-post-card";
import { PostCard } from "@/components/creator/post-card";
import { SubscribeCTA } from "@/components/creator/subscribe-cta";
import { TierCards, type PublicTier } from "@/components/creator/tier-cards";
import { Notice } from "@/components/notice";
import { SubscribeButton } from "@/components/subscribe-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStripeClient } from "@/lib/stripe";
import { syncSubscriptionFromCheckoutSessionId } from "@/lib/stripe/webhook-processor";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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
      "id, slug, title, tagline, about, owner_user_id, accent_color, cover_image_url, avatar_url, seo_description, social_links, featured_media_type, featured_video_id, featured_thumbnail_url, featured_image_url, pricing_mode, single_price_cents, single_price_currency",
    )
    .eq("slug", slug)
    .maybeSingle();
}

async function syncCheckoutSubscription(sessionId: string, userId: string) {
  const supabase = createAdminSupabaseClient();
  const stripe = getStripeClient();

  try {
    await syncSubscriptionFromCheckoutSessionId({
      supabase,
      stripe,
      sessionId,
      expectedUserId: userId,
    });
  } catch (error) {
    console.error("Failed to sync checkout subscription", {
      sessionId,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
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
  const checkoutSessionId = typeof query.session_id === "string" ? query.session_id : null;

  const checkoutSuccess = query.checkout === "success" ? "Předplatné bylo aktivováno. Přístup se brzy propíše." : null;
  const checkoutCancel = query.checkout === "cancel" ? "Platba byla zrušena." : null;

  const supabase = await createServerSupabaseClient();
  const cookieStore = await cookies();
  const { user } = await getAuthUser(supabase, cookieStore.getAll());

  if (query.checkout === "success" && checkoutSessionId && user?.id) {
    await syncCheckoutSubscription(checkoutSessionId, user.id);
  }

  const { data: creator, error: creatorError } = await getCreatorBySlug(slug);

  if (creatorError || !creator) {
    notFound();
  }

  const [{ data: tiers }, { data: previewRows }, { data: memberRank }, { count: activeSubscribers }] = await Promise.all([
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
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .in("status", ["active", "trialing"]),
  ]);

  const isOwner = user?.id === creator.owner_user_id;
  const activeRank = Number(memberRank ?? 0);
  const hasMembership = activeRank >= 1;
  const pricingMode = creator.pricing_mode === "single" ? "single" : "tiers";
  const typedTiers = (tiers ?? []) as PublicTier[];
  const primaryTierId = typedTiers[0]?.id;
  const singlePriceLabel =
    typeof creator.single_price_cents === "number"
      ? `${(creator.single_price_cents / 100).toLocaleString("cs-CZ", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${creator.single_price_currency ?? "CZK"}`
      : null;

  const posts = (previewRows ?? []) as Array<{
    id: string;
    title: string;
    body_preview: string | null;
    visibility: "public" | "members" | "tier";
    min_tier_rank: number | null;
    published_at: string;
    has_access: boolean;
    has_video: boolean;
    video_thumbnail_url?: string | null;
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
    <div className="relative left-1/2 w-screen -translate-x-1/2 space-y-8" style={creatorStyle}>
      <CreatorHeader
        slug={creator.slug}
        title={creator.title}
        tagline={creator.tagline}
        about={creator.about}
        coverImageUrl={creator.cover_image_url}
        avatarUrl={creator.avatar_url}
        socialLinks={socialLinks}
        ownerView={isOwner}
        subscriberCount={activeSubscribers ?? undefined}
        postCount={posts.length}
      />

      <div className="mx-auto w-full max-w-4xl px-4 space-y-3">
        <Notice message={checkoutSuccess} variant="success" />
        <Notice message={checkoutCancel} variant="error" />
      </div>

      <section id={`tiers-${creator.slug}`} className="mx-auto w-full max-w-4xl px-4 py-12 space-y-4 scroll-mt-20">
        {pricingMode === "single" ? (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Členství</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Tento tvůrce používá jednotnou cenu bez tierů.
              </p>
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Jednotné členství</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {singlePriceLabel ? (
                  <p className="text-lg font-semibold text-[var(--accent)]">{singlePriceLabel} / měsíc</p>
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">Cena bude doplněna tvůrcem.</p>
                )}

                {primaryTierId ? (
                  user ? (
                    <SubscribeButton tierId={primaryTierId} />
                  ) : (
                    <Button asChild>
                      <a href={`/login?next=/c/${creator.slug}`}>Přihlásit a odebírat</a>
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Pro aktivaci checkoutu vytvoř v dashboardu aspoň jeden aktivní plán.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Předplatné</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Vyber si úroveň přístupu a odemkni prémiové příspěvky.</p>
            </div>
            <TierCards tiers={typedTiers} isAuthenticated={Boolean(user)} loginUrl={`/login?next=/c/${creator.slug}`} />
          </>
        )}
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-24 space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Příspěvky</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Veřejné příspěvky jsou dostupné všem, ostatní mají náhled.</p>
        </div>

        {posts.length === 0 ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Zatím žádné příspěvky</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-300">
              Tento tvůrce zatím nic nepublikoval.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) =>
              post.has_access ? <PostCard key={post.id} slug={creator.slug} post={post} /> : <LockedPostCard key={post.id} post={post} />,
            )}
          </div>
        )}
      </section>

      <footer className="border-t border-zinc-200/60 py-10 dark:border-zinc-800/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left">
          <p className="text-xl font-bold text-gradient">MadTV</p>
          <p className="text-sm text-zinc-500">© 2026 MadTV. Všechna práva vyhrazena.</p>
          <div className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-300">
            <Link href="/explore" className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-100">
              Ukázky
            </Link>
            <Link href="/for-creators" className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-100">
              Pro tvůrce
            </Link>
          </div>
        </div>
      </footer>

      <SubscribeCTA
        creatorSlug={creator.slug}
        creatorName={creator.title}
        lowestPrice={
          pricingMode === "single"
            ? singlePriceLabel ?? undefined
            : typedTiers.length > 0
              ? `${((typedTiers[0].price_cents as number) / 100).toLocaleString("cs-CZ")} ${(typedTiers[0].currency as string)}`
              : undefined
        }
        hasMembership={hasMembership || isOwner}
      />
    </div>
  );
}
