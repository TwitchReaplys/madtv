import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SurfaceCard, spacing, withAlpha } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { useAuth } from "@/hooks/useAuth";
import { useAppTheme } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { mode, theme } = useAppTheme();

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleReset() {
    setPending(true);
    setFeedback(null);
    setIsError(false);

    const result = await resetPassword(email.trim());
    setPending(false);

    if (result.error) {
      setFeedback(result.error);
      setIsError(true);
      return;
    }

    setFeedback("Password reset email sent. Please check your inbox.");
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Reset password</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>We’ll send you a secure reset link.</Text>
      </View>

      <SurfaceCard mode={mode} style={styles.card}>
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
          <TextInput
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor={withAlpha(theme.textSecondary, 0.7)}
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { color: theme.textPrimary, borderColor: withAlpha(theme.border, 0.8) }]}
          />
        </View>

        {feedback ? (
          <Text style={[styles.feedback, { color: isError ? theme.danger : theme.success }]}>{feedback}</Text>
        ) : null}

        <Pressable
          disabled={pending}
          onPress={handleReset}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: theme.accent,
              opacity: pressed || pending ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.primaryLabel}>{pending ? "Sending..." : "Send reset link"}</Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={[styles.link, { color: theme.textSecondary }]}>Back to sign in</Text>
          </Pressable>
        </Link>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
  },
  card: {
    gap: spacing.md,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedback: {
    fontSize: 13,
  },
  primary: {
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: spacing.sm,
  },
  primaryLabel: {
    color: "#031221",
    fontSize: 15,
    fontWeight: "700",
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
