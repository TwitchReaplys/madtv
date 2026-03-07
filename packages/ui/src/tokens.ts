export type ThemeMode = "dark" | "light";

export type AppTheme = {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentMuted: string;
  success: string;
  danger: string;
};

const themes: Record<ThemeMode, AppTheme> = {
  dark: {
    background: "#070A16",
    backgroundAlt: "#0F1530",
    surface: "#121A34",
    surfaceElevated: "#182244",
    border: "#27335B",
    textPrimary: "#F3F6FF",
    textSecondary: "#A5B0D0",
    accent: "#4DD2FF",
    accentMuted: "#1D6FA3",
    success: "#18C08F",
    danger: "#FF6B88",
  },
  light: {
    background: "#F2F5FF",
    backgroundAlt: "#E8EDFF",
    surface: "#FFFFFF",
    surfaceElevated: "#F7F9FF",
    border: "#D5DCF6",
    textPrimary: "#151D36",
    textSecondary: "#4F5B84",
    accent: "#0C93D3",
    accentMuted: "#75C7EC",
    success: "#0D9C70",
    danger: "#D73A5B",
  },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  title: "SpaceGrotesk_700Bold",
  subtitle: "SpaceGrotesk_500Medium",
  body: "SpaceGrotesk_400Regular",
  serif: "InstrumentSerif_400Regular",
} as const;

export function getTheme(mode: ThemeMode): AppTheme {
  return themes[mode];
}

export function withAlpha(hexColor: string, alpha: number) {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(safeAlpha * 255)
    .toString(16)
    .padStart(2, "0");

  const normalized = hexColor.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;

  if (full.length !== 6) {
    return hexColor;
  }

  return `#${full}${alphaHex}`;
}
