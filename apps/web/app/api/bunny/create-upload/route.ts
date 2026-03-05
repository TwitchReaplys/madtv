import { NextResponse } from "next/server";

import { buildBunnyEmbedUrl, sha256Hex } from "@/lib/bunny";
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

  return NextResponse.json({
    videoId,
    libraryId,
    expirationTime,
    signature,
    embedUrl: buildBunnyEmbedUrl(libraryId, videoId),
  });
}
