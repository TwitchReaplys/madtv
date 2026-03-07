import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { spacing } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PaywallPanel } from "@/components/PaywallPanel";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useAnalytics } from "@/hooks/useAnalytics";
import { usePlayback } from "@/hooks/usePlayback";
import { usePost } from "@/hooks/usePost";
import { buildCreatorWebUrl, openExternalUrl } from "@/lib/links";
import { formatPostDate } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

export default function PostDetailScreen() {
  const { id, creatorSlug } = useLocalSearchParams<{ id: string; creatorSlug?: string }>();
  const { theme } = useAppTheme();
  const analytics = useAnalytics();

  const postQuery = usePost(id, creatorSlug);
  const playback = usePlayback(id);

  useEffect(() => {
    if (!postQuery.data?.detail) {
      return;
    }

    analytics.track("post_viewed", {
      post_id: postQuery.data.detail.post_id,
      creator_id: postQuery.data.detail.creator_id,
      creator_slug: postQuery.data.detail.creator_slug,
      has_access: postQuery.data.detail.has_access,
    });

    if (!postQuery.data.detail.has_access) {
      analytics.track("paywall_viewed", {
        post_id: postQuery.data.detail.post_id,
        creator_slug: postQuery.data.detail.creator_slug,
      });
    }
  }, [analytics, postQuery.data?.detail]);

  const firstVideo = useMemo(
    () =>
      (postQuery.data?.assets ?? []).find(
        (asset) => asset.type === "bunny_video" && asset.bunny_library_id && asset.bunny_video_id,
      ),
    [postQuery.data?.assets],
  );

  const requiredRank =
    postQuery.data?.detail.visibility === "tier" ? (postQuery.data?.detail.min_tier_rank ?? 1) : 1;

  return (
    <AppScreen>
      {postQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          <LoadingSkeleton height={36} width="70%" />
          <LoadingSkeleton height={22} width="35%" />
          <LoadingSkeleton height={240} />
        </View>
      ) : null}

      {postQuery.error ? (
        <ErrorState
          message="Could not load this post."
          onRetry={() => {
            void postQuery.refetch();
          }}
        />
      ) : null}

      {!postQuery.isLoading && !postQuery.error && !postQuery.data ? (
        <EmptyState title="Post unavailable" description="This post could not be found or is no longer available." />
      ) : null}

      {postQuery.data ? (
        <>
          <View style={styles.header}>
            <Link
              href={{
                pathname: "/creator/[slug]",
                params: { slug: postQuery.data.detail.creator_slug },
              }}
              style={[styles.back, { color: theme.textSecondary }]}
            >
              Back to {postQuery.data.detail.creator_title}
            </Link>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{postQuery.data.detail.title}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {formatPostDate(postQuery.data.detail.published_at)} • {postQuery.data.detail.visibility}
            </Text>
          </View>

          {postQuery.data.detail.has_access ? (
            <>
              {postQuery.data.detail.body ? (
                <Text style={[styles.body, { color: theme.textSecondary }]}>{postQuery.data.detail.body}</Text>
              ) : null}

              {firstVideo?.bunny_library_id && firstVideo.bunny_video_id ? (
                <VideoPlayer
                  libraryId={firstVideo.bunny_library_id}
                  videoId={firstVideo.bunny_video_id}
                  title={postQuery.data.detail.title}
                  initialPositionSeconds={playback.resumePositionSeconds}
                  onStarted={() => {
                    analytics.track("video_started", {
                      post_id: postQuery.data?.detail.post_id,
                      creator_slug: postQuery.data?.detail.creator_slug,
                    });
                  }}
                  onProgress={(positionSeconds, durationSeconds) => {
                    void playback.trackPlaybackProgress({
                      positionSeconds,
                      durationSeconds,
                    });
                  }}
                  onCompleted={() => {
                    analytics.track("video_completed", {
                      post_id: postQuery.data?.detail.post_id,
                      creator_slug: postQuery.data?.detail.creator_slug,
                    });
                  }}
                />
              ) : null}

              {(postQuery.data.assets ?? [])
                .filter((asset) => asset.type === "image" && typeof asset.storage_path === "string")
                .map((asset) => (
                  <Image key={asset.id} source={{ uri: asset.storage_path as string }} style={styles.imageAsset} />
                ))}
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {postQuery.data.detail.body_preview || "This member-only post includes additional content after subscribing."}
              </Text>
              <PaywallPanel
                creatorSlug={postQuery.data.detail.creator_slug}
                creatorTitle={postQuery.data.detail.creator_title}
                tiers={postQuery.data.tiers}
                requiredRank={requiredRank}
                accentColor={postQuery.data.detail.accent_color}
                onOpenCheckout={(tierId) => {
                  analytics.track("checkout_cta_tapped", {
                    source: "post_paywall",
                    creator_slug: postQuery.data?.detail.creator_slug,
                    post_id: postQuery.data?.detail.post_id,
                    tier_id: tierId,
                  });
                  void openExternalUrl(buildCreatorWebUrl(postQuery.data?.detail.creator_slug ?? "", tierId));
                }}
              />
            </>
          )}
        </>
      ) : null}

      <View style={styles.footerRow}>
        <Text
          onPress={() => router.push("/(tabs)/home")}
          style={[styles.footerLink, { color: theme.textSecondary }]}
        >
          Back to Home
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  back: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 35,
  },
  meta: {
    fontSize: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
  },
  imageAsset: {
    borderRadius: 16,
    height: 220,
    width: "100%",
  },
  skeletonWrap: {
    gap: spacing.sm,
  },
  footerRow: {
    alignItems: "center",
  },
  footerLink: {
    fontSize: 13,
  },
});
