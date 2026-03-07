import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type AuthActionResult = {
  error: string | null;
  needsEmailVerification?: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isBootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (mounted) {
          setIsBootstrapping(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsBootstrapping(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isBootstrapping,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          return {
            error: error.message,
          };
        }

        return {
          error: null,
        };
      },
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${env.EXPO_PUBLIC_APP_WEB_URL.replace(/\/$/, "")}/dashboard`,
          },
        });

        if (error) {
          return {
            error: error.message,
          };
        }

        return {
          error: null,
          needsEmailVerification: !Boolean(data.session),
        };
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${env.EXPO_PUBLIC_APP_WEB_URL.replace(/\/$/, "")}/dashboard`,
        });

        if (error) {
          return {
            error: error.message,
          };
        }

        return {
          error: null,
        };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [isBootstrapping, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return context;
}
