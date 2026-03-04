import crypto from "crypto";

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function buildBunnyEmbedUrl(libraryId: string | number, videoId: string) {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

export function buildSecureBunnyEmbedUrl(
  libraryId: string | number,
  videoId: string,
  tokenKey: string,
  expiresUnix: number,
) {
  const token = sha256Hex(`${tokenKey}${videoId}${expiresUnix}`);
  const base = buildBunnyEmbedUrl(libraryId, videoId);
  return `${base}?token=${token}&expires=${expiresUnix}`;
}
