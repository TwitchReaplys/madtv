export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const cookieSecureOverride =
  process.env.NEXT_PUBLIC_SUPABASE_COOKIE_SECURE ?? process.env.SUPABASE_COOKIE_SECURE;

export function assertSupabasePublicEnv() {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}

function parseBoolean(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }

  return null;
}

function isHttpsUrl(url: string | undefined) {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

type CookieProtocolInput = {
  requestProtocol?: string;
};

export function resolveSecureCookieFlag({ requestProtocol }: CookieProtocolInput = {}) {
  const explicitFlag = parseBoolean(cookieSecureOverride);
  if (explicitFlag !== null) {
    return explicitFlag;
  }

  if (requestProtocol) {
    const normalized = requestProtocol.toLowerCase();
    if (normalized === "https" || normalized === "https:") {
      return true;
    }

    if (normalized === "http" || normalized === "http:") {
      return false;
    }
  }

  return isHttpsUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function buildSupabaseCookieOptions(input: CookieProtocolInput = {}) {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: resolveSecureCookieFlag(input),
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}
