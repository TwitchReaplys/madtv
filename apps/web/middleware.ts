import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthUser } from "@/lib/supabase/auth";
import { assertSupabasePublicEnv, buildSupabaseCookieOptions, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/shared";

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
}

export async function middleware(request: NextRequest) {
  assertSupabasePublicEnv();

  let response = NextResponse.next({
    request,
  });

  const forwardedProto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
    cookieOptions: buildSupabaseCookieOptions({
      requestProtocol: forwardedProto,
    }),
  });

  const auth = await getAuthUser(supabase, request.cookies.getAll());
  const user = auth.user;
  const isVerified = auth.isVerified;

  if (isProtectedPath(request.nextUrl.pathname) && (!user || !isVerified)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (user && isVerified && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
