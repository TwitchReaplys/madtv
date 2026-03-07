import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageBackground, StyleSheet, Text, View } from "react-native";
import type { CreatorDetail } from "@madtv/shared";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { useAppTheme } from "@/lib/theme";

type CreatorHeroProps = {
  creator: CreatorDetail;
  activeRank?: number;
};

export function CreatorHero({ creator, activeRank = 0 }: CreatorHeroProps) {
  const { theme } = useAppTheme();
  const accent = creator.accent_color ?? theme.accent;

  return (
    <View style={styles.wrap}>
      <ImageBackground
        source={creator.cover_image_url ? { uri: creator.cover_image_url } : undefined}
        style={[styles.cover, { backgroundColor: withAlpha(theme.surfaceElevated, 0.9) }]}
        imageStyle={styles.coverImage}
      >
        <LinearGradient
          colors={[withAlpha("#000000", 0.12), withAlpha(theme.background, 0.92)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.coverOverlay}
        >
          <View style={[styles.avatarFrame, { borderColor: withAlpha(accent, 0.55) }]}> 
            {creator.avatar_url ? <Image source={{ uri: creator.avatar_url }} style={styles.avatar} /> : null}
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{creator.title}</Text>
            {creator.tagline ? <Text style={[styles.tagline, { color: theme.textSecondary }]}>{creator.tagline}</Text> : null}
            <Text style={[styles.rank, { color: accent }]}>Your rank: {activeRank}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      {creator.about ? <Text style={[styles.about, { color: theme.textSecondary }]}>{creator.about}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  cover: {
    borderRadius: radius.lg,
    minHeight: 220,
    overflow: "hidden",
  },
  coverImage: {
    borderRadius: radius.lg,
  },
  coverOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  avatarFrame: {
    borderRadius: radius.md,
    borderWidth: 2,
    height: 72,
    marginBottom: spacing.sm,
    overflow: "hidden",
    width: 72,
  },
  avatar: {
    height: "100%",
    width: "100%",
  },
  textWrap: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
  },
  rank: {
    fontSize: 12,
    fontWeight: "700",
  },
  about: {
    fontSize: 14,
    lineHeight: 21,
  },
});
