import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SurfaceCard, spacing, withAlpha } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { api } from "@/lib/api";
import { buildBillingWebUrl, openExternalUrl } from "@/lib/links";
import { useAppTheme } from "@/lib/theme";

export default function AccountScreen() {
  const { session, signOut } = useAuth();
  const { theme, mode } = useAppTheme();
  const [signingOut, setSigningOut] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile", "account"],
    queryFn: () => api.getCurrentProfile(),
    enabled: Boolean(session),
  });
  const subscriptionsQuery = useSubscriptions();

  const activeCount = useMemo(
    () =>
      (subscriptionsQuery.data ?? []).filter((subscription) =>
        ["active", "trialing"].includes(subscription.status),
      ).length,
    [subscriptionsQuery.data],
  );

  if (!session) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sign in to manage memberships and billing.</Text>
        </View>

        <EmptyState
          title="You are not signed in"
          description="Sign in or create an account to access your subscriptions."
          actionLabel="Sign in"
          onAction={() => router.push("/(auth)/login")}
        />

        <Link href="/(auth)/signup" asChild>
          <Pressable>
            <Text style={[styles.signupLink, { color: theme.accent }]}>Create a new account</Text>
          </Pressable>
        </Link>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Account</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Profile, memberships, and billing.</Text>
      </View>

      <SurfaceCard mode={mode} style={styles.card}>
        <Text style={[styles.profileName, { color: theme.textPrimary }]}> 
          {profileQuery.data?.display_name || profileQuery.data?.username || session.user.email || "Member"}
        </Text>
        <Text style={[styles.profileSub, { color: theme.textSecondary }]}>{session.user.email}</Text>
      </SurfaceCard>

      {subscriptionsQuery.error ? (
        <ErrorState
          message="Could not load subscriptions right now."
          onRetry={() => {
            void subscriptionsQuery.refetch();
          }}
        />
      ) : null}

      <SurfaceCard mode={mode} style={styles.card}>
        <View style={styles.metricsRow}>
          <View style={[styles.metric, { borderColor: withAlpha(theme.border, 0.65) }]}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Active memberships</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{activeCount}</Text>
          </View>
          <View style={[styles.metric, { borderColor: withAlpha(theme.border, 0.65) }]}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>All memberships</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{subscriptionsQuery.data?.length ?? 0}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            void openExternalUrl(buildBillingWebUrl());
          }}
          style={({ pressed }) => [
            styles.manageButton,
            {
              borderColor: withAlpha(theme.accent, 0.6),
              backgroundColor: withAlpha(theme.accent, 0.2),
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[styles.manageButtonLabel, { color: theme.accent }]}>Manage subscriptions on web</Text>
        </Pressable>
      </SurfaceCard>

      <Pressable
        onPress={async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
          router.replace("/(auth)/login");
        }}
        style={({ pressed }) => [
          styles.signOut,
          {
            borderColor: withAlpha(theme.border, 0.75),
            backgroundColor: withAlpha(theme.surfaceElevated, 0.82),
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Text style={[styles.signOutLabel, { color: theme.textPrimary }]}>{signingOut ? "Signing out..." : "Sign out"}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginTop: spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    gap: spacing.md,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
  },
  profileSub: {
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  manageButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  manageButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  signOut: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  signOutLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
