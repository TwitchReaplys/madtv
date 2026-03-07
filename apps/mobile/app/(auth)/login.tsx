import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SurfaceCard, spacing, withAlpha } from "@madtv/ui";

import { AppScreen } from "@/components/AppScreen";
import { useAuth } from "@/hooks/useAuth";
import { useAppTheme } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { mode, theme } = useAppTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setPending(true);
    setError(null);

    const result = await signIn(email.trim(), password);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/(tabs)/home");
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: theme.accent }]}>MadTV</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sign in to unlock creator memberships.</Text>
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
            placeholder="••••••••"
            placeholderTextColor={withAlpha(theme.textSecondary, 0.7)}
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: theme.textPrimary, borderColor: withAlpha(theme.border, 0.8) }]}
          />
        </View>

        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

        <Pressable
          disabled={pending}
          onPress={handleSignIn}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: theme.accent,
              opacity: pressed || pending ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.primaryLabel}>{pending ? "Signing in..." : "Sign in"}</Text>
        </Pressable>

        <View style={styles.linksRow}>
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text style={[styles.link, { color: theme.textSecondary }]}>Forgot password?</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text style={[styles.link, { color: theme.accent }]}>Create account</Text>
            </Pressable>
          </Link>
        </View>
      </SurfaceCard>

      <Pressable onPress={() => router.replace("/(tabs)/home")}>
        <Text style={[styles.guestLink, { color: theme.textSecondary }]}>Continue as guest</Text>
      </Pressable>
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
  error: {
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
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
  },
  guestLink: {
    fontSize: 13,
    textAlign: "center",
  },
});
