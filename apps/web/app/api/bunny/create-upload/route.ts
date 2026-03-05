import { NextResponse } from "next/server";

import { buildBunnyEmbedUrl, sha256Hex } from "@/lib/bunny";
import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bunnyCreateUploadSchema } from "@/lib/validators/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = bunnyCreateUploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }

  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;

  if (!apiKey || !libraryId) {
    return NextResponse.json({ error: "Missing Bunny Stream env vars" }, { status: 500 });
  }

  if (!parsed.data.creatorId) {
    return NextResponse.json({ error: "creatorId is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_creator_admin", {
    p_creator_id: parsed.data.creatorId,
  });

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const title = parsed.data.title?.trim() || `upload-${Date.now()}`;

  const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      {
        error: `Failed to create Bunny video object: ${errorText}`,
      },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as { guid?: string };
  const videoId = payload.guid;

  if (!videoId) {
    return NextResponse.json({ error: "Bunny response missing video guid" }, { status: 502 });
  }

  const expirationTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const signature = sha256Hex(`${libraryId}${apiKey}${expirationTime}${videoId}`);

  const { error: upsertError } = await supabase.from("creator_videos").upsert(
    {
      creator_id: parsed.data.creatorId,
      title,
      bunny_video_id: videoId,
      status: "uploading",
      meta: {
        bunny_library_id: libraryId,
        created_via: "create-upload-route",
      },
    },
    {
      onConflict: "bunny_video_id",
    },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    videoId,
    libraryId,
    expirationTime,
    signature,
    embedUrl: buildBunnyEmbedUrl(libraryId, videoId),
  });
}
