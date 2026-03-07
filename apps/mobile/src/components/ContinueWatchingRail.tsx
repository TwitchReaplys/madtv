import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ContinueWatchingItem } from "@madtv/shared";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { formatRelativeSeconds, percentage } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

type ContinueWatchingRailProps = {
  items: ContinueWatchingItem[];
  onOpenPost: (postId: string, creatorSlug: string) => void;
};

export function ContinueWatchingRail({ items, onOpenPost }: ContinueWatchingRailProps) {
  const { theme } = useAppTheme();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: theme.textPrimary }]}>Continue watching</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.map((item) => {
          const progress = percentage(item.position_seconds, item.duration_seconds);

          return (
            <Pressable
              key={item.post_id}
              onPress={() => onOpenPost(item.post_id, item.creator_slug)}
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: withAlpha(theme.surface, 0.95),
                    borderColor: withAlpha(theme.border, 0.65),
                  },
                ]}
              >
                {item.video_thumbnail_url ? <Image source={{ uri: item.video_thumbnail_url }} style={styles.thumb} /> : null}

                <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>
                  {item.post_title}
                </Text>
                <Text numberOfLines={1} style={[styles.creator, { color: theme.textSecondary }]}>
                  {item.creator_title}
                </Text>

                <View style={[styles.progressTrack, { backgroundColor: withAlpha(theme.textSecondary, 0.2) }]}> 
                  <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
                </View>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {formatRelativeSeconds(item.position_seconds)}
                  {item.duration_seconds ? ` / ${formatRelativeSeconds(item.duration_seconds)}` : ""}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
  },
  rail: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
    width: 220,
  },
  thumb: {
    borderRadius: radius.md,
    height: 104,
    width: "100%",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  creator: {
    fontSize: 12,
  },
  progressTrack: {
    borderRadius: radius.pill,
    height: 6,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: radius.pill,
    height: "100%",
  },
  meta: {
    fontSize: 11,
  },
});
