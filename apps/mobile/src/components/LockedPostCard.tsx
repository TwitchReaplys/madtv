import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CreatorPostPreview } from "@madtv/shared";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { formatPostDate } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

type LockedPostCardProps = {
  post: CreatorPostPreview;
  onPress: () => void;
  accentColor?: string | null;
};

export function LockedPostCard({ post, onPress, accentColor }: LockedPostCardProps) {
  const { theme } = useAppTheme();
  const accent = accentColor ?? theme.accent;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}> 
      <View
        style={[
          styles.card,
          {
            borderColor: withAlpha(accent, 0.45),
            backgroundColor: withAlpha(theme.surface, 0.9),
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.lockBadge, { backgroundColor: withAlpha(accent, 0.2), borderColor: withAlpha(accent, 0.45) }]}> 
            <Text style={[styles.lockBadgeText, { color: accent }]}>Locked</Text>
          </View>
          <Text style={[styles.date, { color: theme.textSecondary }]}>{formatPostDate(post.published_at)}</Text>
        </View>

        <Text style={[styles.title, { color: theme.textPrimary }]}>{post.title}</Text>
        <View style={styles.teaserWrap}>
          <View style={[styles.blurLine, { backgroundColor: withAlpha(theme.textSecondary, 0.15) }]} />
          <View style={[styles.blurLineShort, { backgroundColor: withAlpha(theme.textSecondary, 0.12) }]} />
        </View>
        <Text style={[styles.ctaText, { color: accent }]}>Unlock on web</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lockBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  date: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  teaserWrap: {
    gap: spacing.xs,
  },
  blurLine: {
    borderRadius: 8,
    height: 14,
    width: "100%",
  },
  blurLineShort: {
    borderRadius: 8,
    height: 14,
    width: "72%",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
