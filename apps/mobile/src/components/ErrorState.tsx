import { Pressable, StyleSheet, Text, View } from "react-native";
import { SurfaceCard, spacing } from "@madtv/ui";

import { useAppTheme } from "@/lib/theme";

type ErrorStateProps = {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  const { mode, theme } = useAppTheme();

  return (
    <SurfaceCard mode={mode}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.danger }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retry,
              {
                borderColor: theme.border,
                backgroundColor: theme.surfaceElevated,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.retryLabel, { color: theme.textPrimary }]}>{retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retry: {
    marginTop: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryLabel: {
    fontWeight: "600",
  },
});
