import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { spacing, withAlpha } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { CreatorCard } from "@/components/CreatorCard";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useCreators } from "@/hooks/useCreators";
import { useAppTheme } from "@/lib/theme";

const placeholderCategories = ["Fitness", "Music", "Cinema", "Gaming", "Lifestyle"];

export default function DiscoverScreen() {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  const creatorsQuery = useCreators({ query: debouncedQuery || undefined, limit: 30 });

  const title = useMemo(
    () => (debouncedQuery.length > 0 ? `Results for “${debouncedQuery}”` : "Browse creators"),
    [debouncedQuery],
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Discover</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Search creators and jump into premium feeds.</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Search creators"
        placeholderTextColor={withAlpha(theme.textSecondary, 0.7)}
        style={[
          styles.search,
          {
            color: theme.textPrimary,
            borderColor: withAlpha(theme.border, 0.75),
            backgroundColor: withAlpha(theme.surface, 0.9),
          },
        ]}
      />

      <View style={styles.categoriesWrap}>
        {placeholderCategories.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.category,
              {
                borderColor: withAlpha(theme.border, 0.65),
                backgroundColor: withAlpha(theme.surfaceElevated, 0.82),
              },
            ]}
          >
            <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>{category}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.results}>
        <Text style={[styles.resultsTitle, { color: theme.textPrimary }]}>{title}</Text>

        {creatorsQuery.isLoading ? (
          <View style={styles.skeletonWrap}>
            <LoadingSkeleton height={140} />
            <LoadingSkeleton height={140} />
          </View>
        ) : null}

        {creatorsQuery.error ? (
          <ErrorState
            message="Could not load creators."
            onRetry={() => {
              void creatorsQuery.refetch();
            }}
          />
        ) : null}

        {!creatorsQuery.isLoading && !creatorsQuery.error && (creatorsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No creators found"
            description="Try another search term or browse featured creators."
            actionLabel="Clear search"
            onAction={() => setQuery("")}
          />
        ) : null}

        {(creatorsQuery.data ?? []).map((creator) => (
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
  search: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  category: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  results: {
    gap: spacing.sm,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  skeletonWrap: {
    gap: spacing.sm,
  },
});
