import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { spacing } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { ContinueWatchingRail } from "@/components/ContinueWatchingRail";
import { CreatorCard } from "@/components/CreatorCard";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PostCard } from "@/components/PostCard";
import { useCreators } from "@/hooks/useCreators";
import { useContinueWatching } from "@/hooks/usePlayback";
import { useRecentPublicPosts } from "@/hooks/usePosts";
import { api } from "@/lib/api";
import { useAppTheme } from "@/lib/theme";

export default function HomeScreen() {
  const { theme } = useAppTheme();

  const featuredCreators = useCreators({ limit: 8 });
  const recentPosts = useRecentPublicPosts(8);
  const continueWatching = useContinueWatching(10);
  const profileQuery = useQuery({
    queryKey: ["profile", "home"],
    queryFn: () => api.getCurrentProfile(),
  });

  const greetingName = useMemo(() => {
    const profile = profileQuery.data;

    if (profile?.display_name) {
      return profile.display_name;
    }

    if (profile?.username) {
      return profile.username;
    }

    return "there";
  }, [profileQuery.data]);

  return (
    <AppScreen>
      <View style={styles.hero}>
        <Text style={[styles.kicker, { color: theme.accent }]}>Discover</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Hey {greetingName}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Premium creator spaces and member-only drops.</Text>
      </View>

      <ContinueWatchingRail
        items={continueWatching.data ?? []}
        onOpenPost={(postId, creatorSlug) =>
          router.push({
            pathname: "/post/[id]",
            params: { id: postId, creatorSlug },
          })
        }
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Featured creators</Text>

        {featuredCreators.isLoading ? (
          <View style={styles.skeletonWrap}>
            <LoadingSkeleton height={138} />
            <LoadingSkeleton height={138} />
          </View>
        ) : null}

        {featuredCreators.error ? (
          <ErrorState
            message="Could not load featured creators."
            onRetry={() => {
              void featuredCreators.refetch();
            }}
          />
        ) : null}

        {!featuredCreators.isLoading && !featuredCreators.error && (featuredCreators.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No creators yet"
            description="Featured creators will appear here as soon as they publish content."
          />
        ) : null}

        {(featuredCreators.data ?? []).map((creator) => (
          <CreatorCard
            key={creator.id}
            creator={creator}
            onPress={() =>
              router.push({
                pathname: "/creator/[slug]",
                params: { slug: creator.slug },
              })
            }
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent public posts</Text>

        {recentPosts.isLoading ? (
          <View style={styles.skeletonWrap}>
            <LoadingSkeleton height={200} />
            <LoadingSkeleton height={200} />
          </View>
        ) : null}

        {recentPosts.error ? (
          <ErrorState
            message="Could not load public posts right now."
            onRetry={() => {
              void recentPosts.refetch();
            }}
          />
        ) : null}

        {(recentPosts.data ?? []).map((post) => (
          <PostCard
            key={post.id}
            post={post}
            accentColor={post.creator_accent_color}
            onPress={() =>
              router.push({
                pathname: "/post/[id]",
                params: {
                  id: post.id,
                  creatorSlug: post.creator_slug,
                },
              })
            }
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 4,
    marginTop: spacing.md,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
  },
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
