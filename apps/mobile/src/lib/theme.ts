import { getTheme, type ThemeMode } from "@madtv/ui";
import { useColorScheme } from "react-native";

export function resolveThemeMode(colorScheme: ReturnType<typeof useColorScheme>): ThemeMode {
  return colorScheme === "light" ? "light" : "dark";
}

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const mode = resolveThemeMode(colorScheme);

  return {
    mode,
    theme: getTheme(mode),
  };
}
