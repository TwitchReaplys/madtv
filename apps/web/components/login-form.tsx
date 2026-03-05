"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        setPending(false);
        return;
      }

      router.push(nextPath);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setMessage(error.message);
      setPending(false);
      return;
    }

    if (data.session) {
      router.push(nextPath);
      router.refresh();
      return;
    }

    setMessage("Signup successful. Verify email settings and continue.");
    setPending(false);
  }

  return (
    <Card className="animate-fade-slide-up">
      <CardHeader>
        <CardTitle>Account access</CardTitle>
        <CardDescription>Sign in or create a new account to open dashboard and subscriptions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
          <TabsList className="w-full">
            <TabsTrigger className="w-full" value="sign-in">
              Sign in
            </TabsTrigger>
            <TabsTrigger className="w-full" value="sign-up">
              Sign up
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {message ? <p className="text-sm text-rose-600 dark:text-rose-300">{message}</p> : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
