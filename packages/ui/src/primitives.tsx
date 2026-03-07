import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps, type TextProps, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { getTheme, radius, spacing, type ThemeMode, withAlpha } from "./tokens";

type ThemeProps = {
  mode?: ThemeMode;
};

type SurfaceCardProps = ViewProps &
  ThemeProps & {
    children: ReactNode;
  };

type ScreenGradientProps = ThemeProps & {
  children: ReactNode;
};

type AppTextProps = TextProps &
  ThemeProps & {
    muted?: boolean;
    children: ReactNode;
  };

type AppButtonProps = PressableProps &
  ThemeProps & {
    title: string;
    subtle?: boolean;
  };

export function ScreenGradient({ children, mode = "dark" }: ScreenGradientProps) {
  const theme = getTheme(mode);

  return (
    <LinearGradient
      colors={[theme.background, theme.backgroundAlt, withAlpha(theme.accentMuted, 0.35)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
}

export function SurfaceCard({ children, mode = "dark", style, ...props }: SurfaceCardProps) {
  const theme = getTheme(mode);

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: withAlpha(theme.surface, 0.92),
          borderColor: withAlpha(theme.border, 0.7),
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AppText({ children, mode = "dark", muted = false, style, ...props }: AppTextProps) {
  const theme = getTheme(mode);

  return (
    <Text
      {...props}
      style={[
        {
          color: muted ? theme.textSecondary : theme.textPrimary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function AppButton({ title, subtle = false, mode = "dark", style, ...props }: AppButtonProps) {
  const theme = getTheme(mode);

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        {
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          backgroundColor: subtle ? withAlpha(theme.surfaceElevated, 0.85) : theme.accent,
          borderWidth: 1,
          borderColor: subtle ? withAlpha(theme.border, 0.65) : withAlpha(theme.accent, 0.4),
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
          alignItems: "center",
          justifyContent: "center",
        },
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      <Text
        style={{
          color: subtle ? theme.textPrimary : "#041224",
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
