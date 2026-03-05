import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { enqueueAnalyticsAggregate } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyticsEventSchema } from "@/lib/validators/schemas";

export const runtime = "nodejs";

function buildSessionId(request: Request, fallback = "anonymous") {
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const ua = request.headers.get("user-agent") ?? "";
  return createHash("sha256").update(`${ip}|${ua}|${fallback}`).digest("hex");
}

function todayUtcString() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "";
  }

  return forwardedFor.split(",")[0]?.trim() ?? "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = analyticsEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  const rateLimitWindow = Math.floor(Date.now() / 60_000);
  const rateLimit = await checkRateLimit({
    key: `rate:analytics:${ipHash}:${rateLimitWindow}`,
    limit: 120,
    windowSeconds: 120,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many analytics events" }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  const sessionId = parsed.data.sessionId?.trim()
    ? createHash("sha256").update(parsed.data.sessionId.trim()).digest("hex")
    : buildSessionId(request, parsed.data.creatorId);

  const adminSupabase = createAdminSupabaseClient();
  const { error } = await adminSupabase.from("analytics_events").insert({
    event_type: parsed.data.eventType,
    creator_id: parsed.data.creatorId,
    post_id: parsed.data.postId ?? null,
    asset_id: parsed.data.assetId ?? null,
    user_id: user?.id ?? null,
    session_id: sessionId,
    meta: parsed.data.meta ?? {},
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await enqueueAnalyticsAggregate(parsed.data.creatorId, todayUtcString()).catch(() => {
    // Analytics aggregation retry is best effort and should not block tracking writes.
  });

  return NextResponse.json({ ok: true });
}
