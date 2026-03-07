import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SurfaceCard, spacing, withAlpha } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { useAuth } from "@/hooks/useAuth";
import { useAppTheme } from "@/lib/theme";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { mode, theme } = useAppTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignUp() {
    setMessage(null);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await signUp(email.trim(), password);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailVerification) {
      setMessage("Check your email to verify your account, then sign in.");
      return;
    }

    router.replace("/(tabs)/home");
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: theme.accent }]}>Create account</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Join creators</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Use one account across web checkout and mobile viewing.</Text>
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

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
          <TextInput
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Minimum 6 characters"
            placeholderTextColor={withAlpha(theme.textSecondary, 0.7)}
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: theme.textPrimary, borderColor: withAlpha(theme.border, 0.8) }]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm password</Text>
          <TextInput
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Repeat password"
            placeholderTextColor={withAlpha(theme.textSecondary, 0.7)}
            value={confirm}
            onChangeText={setConfirm}
            style={[styles.input, { color: theme.textPrimary, borderColor: withAlpha(theme.border, 0.8) }]}
          />
        </View>

        {error ? <Text style={[styles.feedback, { color: theme.danger }]}>{error}</Text> : null}
        {message ? <Text style={[styles.feedback, { color: theme.success }]}>{message}</Text> : null}

        <Pressable
          disabled={pending}
          onPress={handleSignUp}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: theme.accent,
              opacity: pressed || pending ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.primaryLabel}>{pending ? "Creating..." : "Create account"}</Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={[styles.link, { color: theme.textSecondary }]}>Already have an account? Sign in</Text>
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
  kicker: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
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
