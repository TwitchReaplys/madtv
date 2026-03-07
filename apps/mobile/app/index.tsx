import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { spacing } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { useAuth } from "@/hooks/useAuth";
import { useAppTheme } from "@/lib/theme";

export default function IndexScreen() {
  const { isBootstrapping, session } = useAuth();
  const { theme } = useAppTheme();

  if (isBootstrapping) {
    return (
      <AppScreen scroll={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
        <View style={styles.copyWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Bootstrapping session</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Preparing your creator feed...</Text>
        </View>
      </AppScreen>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  copyWrap: {
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
});
