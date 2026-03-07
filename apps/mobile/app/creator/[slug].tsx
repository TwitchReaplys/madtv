import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { CreatorHero } from "@/components/CreatorHero";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { LockedPostCard } from "@/components/LockedPostCard";
import { PostCard } from "@/components/PostCard";
import { TierCard } from "@/components/TierCard";
import { useCreator } from "@/hooks/useCreator";
import { useAnalytics } from "@/hooks/useAnalytics";
import { usePosts } from "@/hooks/usePosts";
import { buildCreatorWebUrl, openExternalUrl } from "@/lib/links";
import { useAppTheme } from "@/lib/theme";

export default function CreatorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { theme } = useAppTheme();
  const analytics = useAnalytics();

  const creatorQuery = useCreator(slug);
  const postsQuery = usePosts(slug);

  useEffect(() => {
    if (!creatorQuery.data?.creator) {
      return;
    }

    analytics.track("creator_viewed", {
      creator_id: creatorQuery.data.creator.id,
      creator_slug: creatorQuery.data.creator.slug,
    });
  }, [analytics, creatorQuery.data?.creator]);

  const creatorBundle = creatorQuery.data;

  return (
    <AppScreen>
      {creatorQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          <LoadingSkeleton height={240} />
          <LoadingSkeleton height={130} />
          <LoadingSkeleton height={130} />
        </View>
      ) : null}

      {creatorQuery.error ? (
        <ErrorState
          message="Could not load creator profile."
          onRetry={() => {
            void creatorQuery.refetch();
          }}
        />
      ) : null}

      {!creatorQuery.isLoading && !creatorQuery.error && !creatorBundle ? (
        <EmptyState title="Creator not found" description="This creator might be unavailable right now." />
      ) : null}

      {creatorBundle ? (
        <>
          <CreatorHero creator={creatorBundle.creator} activeRank={creatorBundle.active_rank} />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Membership tiers</Text>
            {creatorBundle.tiers.length === 0 ? (
              <EmptyState title="No active tiers" description="This creator has not published active membership tiers yet." />
            ) : (
              creatorBundle.tiers.map((tier, index) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  accentColor={creatorBundle.creator.accent_color}
                  highlight={index === 1}
                  onPress={() => {
                    analytics.track("checkout_cta_tapped", {
                      creator_slug: creatorBundle.creator.slug,
                      tier_id: tier.id,
                      source: "creator_screen",
                    });
                    void openExternalUrl(buildCreatorWebUrl(creatorBundle.creator.slug, tier.id));
                  }}
                />
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Posts</Text>

            {postsQuery.isLoading ? (
              <View style={styles.skeletonWrap}>
                <LoadingSkeleton height={190} />
                <LoadingSkeleton height={190} />
              </View>
            ) : null}

            {postsQuery.error ? (
              <ErrorState
                message="Could not load posts."
                onRetry={() => {
                  void postsQuery.refetch();
                }}
              />
            ) : null}

            {!postsQuery.isLoading && !postsQuery.error && (postsQuery.data?.length ?? 0) === 0 ? (
              <EmptyState title="No posts yet" description="This creator has not published any posts yet." />
            ) : null}

            {(postsQuery.data ?? []).map((post) => {
              if (post.has_access) {
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    accentColor={creatorBundle.creator.accent_color}
                    onPress={() =>
                      router.push({
                        pathname: "/post/[id]",
                        params: {
                          id: post.id,
                          creatorSlug: creatorBundle.creator.slug,
                        },
                      })
                    }
                  />
                );
              }

              return (
                <LockedPostCard
                  key={post.id}
                  post={post}
                  accentColor={creatorBundle.creator.accent_color}
                  onPress={() =>
                    router.push({
                      pathname: "/post/[id]",
                      params: {
                        id: post.id,
                        creatorSlug: creatorBundle.creator.slug,
                      },
                    })
                  }
                />
              );
            })}
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  skeletonWrap: {
    gap: spacing.sm,
  },
});
