import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Tier } from "@madtv/shared";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { TierCard } from "@/components/TierCard";
import { useAppTheme } from "@/lib/theme";

type PaywallPanelProps = {
  creatorSlug: string;
  creatorTitle: string;
  tiers: Tier[];
  requiredRank: number;
  accentColor?: string | null;
  onOpenCheckout: (tierId?: string) => void;
};

export function PaywallPanel({
  creatorSlug,
  creatorTitle,
  tiers,
  requiredRank,
  accentColor,
  onOpenCheckout,
}: PaywallPanelProps) {
  const { theme } = useAppTheme();
  const accent = accentColor ?? theme.accent;

  const relevantTiers = tiers.filter((tier) => tier.rank >= requiredRank).sort((a, b) => a.rank - b.rank);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(theme.surface, 0.95),
          borderColor: withAlpha(accent, 0.5),
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>This post is locked</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}> 
        Subscribe to <Text style={{ color: accent, fontWeight: "700" }}>{creatorTitle}</Text> to unlock member content,
        premium videos, and future drops.
      </Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>Minimum required rank: {requiredRank}+</Text>

      <View style={styles.benefits}>
        {[
          "Instant access after checkout",
          "Content unlocks automatically in app",
          "Billing and plan changes managed on web",
        ].map((benefit) => (
          <Text key={benefit} style={[styles.benefitItem, { color: theme.textSecondary }]}>• {benefit}</Text>
        ))}
      </View>

      <View style={styles.tiersWrap}>
        {relevantTiers.map((tier, index) => (
          <TierCard
            key={tier.id}
            tier={tier}
            accentColor={accent}
            onPress={() => onOpenCheckout(tier.id)}
            highlight={index === 0}
          />
        ))}
      </View>

      <Pressable
        onPress={() => onOpenCheckout()}
        style={({ pressed }) => [
          styles.primaryCta,
          {
            backgroundColor: accent,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={styles.primaryCtaLabel}>Subscribe on web</Text>
      </Pressable>
      <Text style={[styles.footerCopy, { color: theme.textSecondary }]}>Open in browser: /c/{creatorSlug}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  hint: {
    fontSize: 12,
    fontWeight: "600",
  },
  benefits: {
    gap: 6,
  },
  benefitItem: {
    fontSize: 13,
  },
  tiersWrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryCta: {
    alignItems: "center",
    borderRadius: radius.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  primaryCtaLabel: {
    color: "#041324",
    fontSize: 14,
    fontWeight: "700",
  },
  footerCopy: {
    fontSize: 11,
    textAlign: "center",
  },
});
