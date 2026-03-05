import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", request.url));
}

export async function GET(request: Request) {
  // Prevent side effects on safe-method requests (prefetch/crawlers).
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
