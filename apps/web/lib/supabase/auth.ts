import type { User } from "@supabase/supabase-js";

type AuthErrorLike = {
  message?: string;
} | null;

type SupabaseAuthLike = {
  auth: {
    getUser: () => Promise<{ data: { user: User | null }; error: AuthErrorLike }>;
    getSession: () => Promise<{ data: { session: { user: User | null } | null }; error: AuthErrorLike }>;
  };
};

export type AuthUserResult = {
  user: User | null;
  source: "getUser" | "getSession-fallback" | "none";
  errorMessage: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown auth error";
}

export async function getAuthUser(supabase: SupabaseAuthLike): Promise<AuthUserResult> {
  let authErrorMessage: string | null = null;

  try {
    const { data, error } = await supabase.auth.getUser();

    if (data.user) {
      return {
        user: data.user,
        source: "getUser",
        errorMessage: null,
      };
    }

    if (!error) {
      return {
        user: null,
        source: "none",
        errorMessage: null,
      };
    }

    authErrorMessage = error.message ?? "Unable to verify user";
  } catch (error) {
    authErrorMessage = getErrorMessage(error);
  }

  try {
    const { data } = await supabase.auth.getSession();

    if (data.session?.user) {
      return {
        user: data.session.user,
        source: "getSession-fallback",
        errorMessage: authErrorMessage,
      };
    }
  } catch {
    // No-op: if fallback session lookup fails, return unauthenticated.
  }

  return {
    user: null,
    source: "none",
    errorMessage: authErrorMessage,
  };
}
