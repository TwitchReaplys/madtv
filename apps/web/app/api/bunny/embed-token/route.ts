import { NextResponse } from "next/server";

import { buildBunnyEmbedUrl, buildSecureBunnyEmbedUrl } from "@/lib/bunny";
import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bunnyEmbedTokenSchema } from "@/lib/validators/schemas";

function parseInputFromRequest(request: Request) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    return {
      videoId: url.searchParams.get("videoId") ?? "",
      libraryId: url.searchParams.get("libraryId") ?? undefined,
    };
  }

  return request
    .json()
    .then((body) => ({
      videoId: typeof body?.videoId === "string" ? body.videoId : "",
      libraryId: typeof body?.libraryId === "string" ? body.libraryId : undefined,
    }))
    .catch(() => ({ videoId: "", libraryId: undefined }));
}

async function handle(request: Request) {
  const input = await parseInputFromRequest(request);
  const parsed = bunnyEmbedTokenSchema.safeParse(input);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const defaultLibraryId = process.env.BUNNY_STREAM_LIBRARY_ID;

  if (!defaultLibraryId) {
    return NextResponse.json({ error: "Missing BUNNY_STREAM_LIBRARY_ID" }, { status: 500 });
  }

  const libraryId = parsed.data.libraryId ?? defaultLibraryId;
  const tokenKey = process.env.BUNNY_EMBED_TOKEN_KEY;

  if (!tokenKey) {
    return NextResponse.json({
      secure: false,
      embedUrl: buildBunnyEmbedUrl(libraryId, parsed.data.videoId),
    });
  }

  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accessibleAsset, error: assetError } = await supabase
    .from("post_assets")
    .select("id")
    .eq("type", "bunny_video")
    .eq("bunny_video_id", parsed.data.videoId)
    .eq("bunny_library_id", libraryId)
    .limit(1)
    .maybeSingle();

  if (assetError) {
    return NextResponse.json({ error: assetError.message }, { status: 500 });
  }

  if (!accessibleAsset) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  const embedUrl = buildSecureBunnyEmbedUrl(libraryId, parsed.data.videoId, tokenKey, expires);

  return NextResponse.json({
    secure: true,
    expires,
    embedUrl,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
