import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Tier } from "@madtv/shared";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { formatCurrency } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

type TierCardProps = {
  tier: Tier;
  accentColor?: string | null;
  onPress?: () => void;
  ctaLabel?: string;
  highlight?: boolean;
};

export function TierCard({ tier, accentColor, onPress, ctaLabel = "Subscribe on web", highlight = false }: TierCardProps) {
  const { theme } = useAppTheme();
  const accent = accentColor ?? theme.accent;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: highlight ? withAlpha(accent, 0.7) : withAlpha(theme.border, 0.65),
          backgroundColor: withAlpha(theme.surface, 0.92),
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{tier.name}</Text>
        <Text style={[styles.rank, { color: accent }]}>Tier {tier.rank}</Text>
      </View>
      <Text style={[styles.price, { color: theme.textPrimary }]}>
        {formatCurrency(tier.price_cents, tier.currency)} / month
      </Text>
      {tier.description ? <Text style={[styles.description, { color: theme.textSecondary }]}>{tier.description}</Text> : null}

      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: withAlpha(accent, 0.2),
              borderColor: withAlpha(accent, 0.45),
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaLabel, { color: accent }]}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  rank: {
    fontSize: 12,
    fontWeight: "700",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  cta: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
  },
  ctaLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
});
