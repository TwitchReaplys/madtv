import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CreatorPostPreview } from "@madtv/shared";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { formatPostDate } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

type PostCardProps = {
  post: CreatorPostPreview;
  onPress: () => void;
  accentColor?: string | null;
};

const visibilityLabel: Record<CreatorPostPreview["visibility"], string> = {
  public: "Public",
  members: "Members",
  tier: "Tier",
};

export function PostCard({ post, onPress, accentColor }: PostCardProps) {
  const { theme } = useAppTheme();
  const accent = accentColor ?? theme.accent;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}> 
      <View
        style={[
          styles.card,
          {
            backgroundColor: withAlpha(theme.surface, 0.92),
            borderColor: withAlpha(theme.border, 0.65),
          },
        ]}
      >
        {post.video_thumbnail_url ? <Image source={{ uri: post.video_thumbnail_url }} style={styles.thumbnail} /> : null}

        <View style={styles.header}>
          <View style={[styles.badge, { borderColor: withAlpha(accent, 0.55), backgroundColor: withAlpha(accent, 0.18) }]}> 
            <Text style={[styles.badgeText, { color: accent }]}> 
              {visibilityLabel[post.visibility]}
              {post.visibility === "tier" && post.min_tier_rank ? ` ${post.min_tier_rank}+` : ""}
            </Text>
          </View>
          <Text style={[styles.date, { color: theme.textSecondary }]}>{formatPostDate(post.published_at)}</Text>
        </View>

        <Text style={[styles.title, { color: theme.textPrimary }]}>{post.title}</Text>
        <Text numberOfLines={3} style={[styles.preview, { color: theme.textSecondary }]}>
          {post.body_preview || "No text preview available."}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.md,
  },
  thumbnail: {
    borderRadius: radius.md,
    height: 160,
    marginBottom: spacing.xs,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  date: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
});
