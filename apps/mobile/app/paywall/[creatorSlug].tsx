import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PaywallPanel } from "@/components/PaywallPanel";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useCreator } from "@/hooks/useCreator";
import { buildCreatorWebUrl, openExternalUrl } from "@/lib/links";
import { useAppTheme } from "@/lib/theme";

export default function CreatorPaywallScreen() {
  const { creatorSlug, requiredRank } = useLocalSearchParams<{ creatorSlug: string; requiredRank?: string }>();
  const { theme } = useAppTheme();
  const analytics = useAnalytics();

  const creatorQuery = useCreator(creatorSlug);
  const required = Number(requiredRank ?? 1) || 1;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Unlock membership</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Subscriptions are managed on web for this MVP.</Text>
      </View>

      {creatorQuery.isLoading ? <LoadingSkeleton height={320} /> : null}

      {creatorQuery.error ? (
        <ErrorState
          message="Could not load creator paywall."
          onRetry={() => {
            void creatorQuery.refetch();
          }}
        />
      ) : null}

      {!creatorQuery.isLoading && !creatorQuery.error && !creatorQuery.data ? (
        <EmptyState title="Creator unavailable" description="This paywall is currently unavailable." />
      ) : null}

      {creatorQuery.data ? (
        <PaywallPanel
          creatorSlug={creatorQuery.data.creator.slug}
          creatorTitle={creatorQuery.data.creator.title}
          tiers={creatorQuery.data.tiers}
          requiredRank={required}
          accentColor={creatorQuery.data.creator.accent_color}
          onOpenCheckout={(tierId) => {
            analytics.track("checkout_cta_tapped", {
              source: "paywall_screen",
              creator_slug: creatorQuery.data?.creator.slug,
              tier_id: tierId,
            });

            void openExternalUrl(buildCreatorWebUrl(creatorQuery.data?.creator.slug ?? "", tierId));
          }}
        />
      ) : null}

      <Text onPress={() => router.back()} style={[styles.back, { color: theme.textSecondary }]}>Close</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  back: {
    fontSize: 13,
    textAlign: "center",
  },
});
