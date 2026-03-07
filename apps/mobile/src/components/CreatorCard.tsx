import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import type { CreatorExplore } from "@madtv/shared";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { formatCurrency } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

type CreatorCardProps = {
  creator: CreatorExplore;
  onPress: () => void;
};

export function CreatorCard({ creator, onPress }: CreatorCardProps) {
  const { theme } = useAppTheme();
  const accent = creator.accent_color ?? theme.accent;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}> 
      <LinearGradient
        colors={[withAlpha(accent, 0.35), withAlpha(theme.surface, 0.92)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderColor: withAlpha(theme.border, 0.65) }]}
      >
        <View style={styles.header}>
          <View style={styles.identityRow}>
            <View style={[styles.avatarFrame, { borderColor: withAlpha(accent, 0.6) }]}> 
              {creator.avatar_url ? <Image source={{ uri: creator.avatar_url }} style={styles.avatar} /> : null}
            </View>
            <View style={styles.identityText}>
              <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>
                {creator.title}
              </Text>
              <Text numberOfLines={2} style={[styles.tagline, { color: theme.textSecondary }]}>
                {creator.tagline || "Members-only posts and videos"}
              </Text>
            </View>
          </View>
          {creator.is_featured ? (
            <View style={[styles.featuredPill, { backgroundColor: withAlpha(accent, 0.22), borderColor: withAlpha(accent, 0.5) }]}> 
              <Text style={[styles.featuredLabel, { color: accent }]}>Featured</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.price, { color: accent }]}>
            {formatCurrency(creator.starting_price_cents, creator.currency)} / month
          </Text>
          <Text style={[styles.members, { color: theme.textSecondary }]}> 
            {(creator.active_members_count ?? 0).toLocaleString()} active members
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
  gradient: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  header: {
    gap: spacing.sm,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  avatarFrame: {
    borderRadius: radius.md,
    borderWidth: 1,
    height: 56,
    overflow: "hidden",
    width: 56,
  },
  avatar: {
    height: "100%",
    width: "100%",
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  tagline: {
    fontSize: 13,
    lineHeight: 18,
  },
  featuredPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  footer: {
    gap: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
  },
  members: {
    fontSize: 12,
  },
});
