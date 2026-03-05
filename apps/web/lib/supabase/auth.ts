import type { User } from "@supabase/supabase-js";

type AuthErrorLike = {
  message?: string;
} | null;

export type CookieLike = {
  name: string;
  value: string;
};

type SupabaseAuthLike = {
  auth: {
    getUser: () => Promise<{ data: { user: User | null }; error: AuthErrorLike }>;
  };
};

export type AuthUserResult = {
  user: User | null;
  source: "cookie-fallback" | "getUser" | "none";
  isVerified: boolean;
  errorMessage: string | null;
};

export type VerifiedAuthUserResult = {
  user: User | null;
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

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(withPadding, "base64").toString("utf8");
}

function safeParseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export function parseCookieHeader(cookieHeader: string | null): CookieLike[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex < 0) {
        return null;
      }

      const name = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      if (!name) {
        return null;
      }

      return { name, value } satisfies CookieLike;
    })
    .filter((entry): entry is CookieLike => entry !== null);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const payloadJson = decodeBase64Url(parts[1]);
    return safeParseJson<Record<string, unknown>>(payloadJson);
  } catch {
    return null;
  }
}

function parseSessionCookieValue(value: string) {
  const candidates = [value];

  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      candidates.push(decoded);
    }
  } catch {
    // Ignore malformed URI sequences.
  }

  for (const candidate of candidates) {
    const withoutPrefix = candidate.startsWith("base64-") ? candidate.slice("base64-".length) : candidate;
    const decodedCandidate = candidate.startsWith("base64-")
      ? (() => {
          try {
            return decodeBase64Url(withoutPrefix);
          } catch {
            return null;
          }
        })()
      : candidate;

    const parsed = decodedCandidate ? safeParseJson<Record<string, unknown>>(decodedCandidate) : null;
    if (!parsed) {
      continue;
    }

    const accessToken = typeof parsed.access_token === "string" ? parsed.access_token : null;
    const parsedUser =
      parsed.user && typeof parsed.user === "object" && !Array.isArray(parsed.user) ? (parsed.user as User) : null;

    if (accessToken || parsedUser) {
      return {
        accessToken,
        user: parsedUser,
      };
    }
  }

  return null;
}

function getSessionFromCookies(cookieEntries: CookieLike[]) {
  const authCookies = cookieEntries.filter((entry) => entry.name.includes("-auth-token"));
  if (authCookies.length === 0) {
    return null;
  }

  const groups = new Map<string, { index: number; value: string }[]>();

  for (const cookie of authCookies) {
    const chunkMatch = cookie.name.match(/^(.*)\.(\d+)$/);
    const key = chunkMatch?.[1] ?? cookie.name;
    const index = chunkMatch?.[2] ? Number.parseInt(chunkMatch[2], 10) : 0;
    const list = groups.get(key) ?? [];
    list.push({
      index: Number.isFinite(index) ? index : 0,
      value: cookie.value,
    });
    groups.set(key, list);
  }

  for (const entries of groups.values()) {
    const sorted = [...entries].sort((a, b) => a.index - b.index);
    const combined = sorted.map((entry) => entry.value).join("");
    const parsed = parseSessionCookieValue(combined);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getUserFromAccessToken(accessToken: string): User | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return null;
  }

  const id = typeof payload.sub === "string" ? payload.sub : null;
  if (!id) {
    return null;
  }

  return {
    id,
    aud: typeof payload.aud === "string" ? payload.aud : "authenticated",
    role: typeof payload.role === "string" ? payload.role : "authenticated",
    email: typeof payload.email === "string" ? payload.email : null,
  } as User;
}

export async function getVerifiedAuthUser(supabase: SupabaseAuthLike): Promise<VerifiedAuthUserResult> {
  let authErrorMessage: string | null = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (data.user) {
      return {
        user: data.user,
        errorMessage: null,
      };
    }

    if (error) {
      authErrorMessage = error.message ?? "Unable to verify user";
    }
  } catch (error) {
    authErrorMessage = getErrorMessage(error);
  }

  return {
    user: null,
    errorMessage: authErrorMessage,
  };
}

export async function getAuthUser(supabase: SupabaseAuthLike, cookieEntries: CookieLike[] = []): Promise<AuthUserResult> {
  const verified = await getVerifiedAuthUser(supabase);

  if (verified.user) {
    return {
      user: verified.user,
      source: "getUser",
      isVerified: true,
      errorMessage: null,
    };
  }

  if (!verified.errorMessage) {
    return {
      user: null,
      source: "none",
      isVerified: false,
      errorMessage: null,
    };
  }

  const cookieSession = getSessionFromCookies(cookieEntries);
  if (cookieSession?.user) {
    return {
      user: cookieSession.user,
      source: "cookie-fallback",
      isVerified: false,
      errorMessage: verified.errorMessage,
    };
  }

  if (cookieSession?.accessToken) {
    const decodedUser = getUserFromAccessToken(cookieSession.accessToken);
    if (decodedUser) {
      return {
        user: decodedUser,
        source: "cookie-fallback",
        isVerified: false,
        errorMessage: verified.errorMessage,
      };
    }
  }

  return {
    user: null,
    source: "none",
    isVerified: false,
    errorMessage: verified.errorMessage,
  };
}
