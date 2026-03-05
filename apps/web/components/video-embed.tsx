import { buildBunnyEmbedUrl, buildSecureBunnyEmbedUrl } from "@/lib/bunny";
import { unixSecondsIn } from "@/lib/time";

type VideoEmbedProps = {
  libraryId: string;
  videoId: string;
  title?: string;
  secure?: boolean;
};

export function VideoEmbed({ libraryId, videoId, title = "Video", secure = false }: VideoEmbedProps) {
  const tokenKey = process.env.BUNNY_EMBED_TOKEN_KEY;

  let src = buildBunnyEmbedUrl(libraryId, videoId);

  if (secure && tokenKey) {
    src = buildSecureBunnyEmbedUrl(libraryId, videoId, tokenKey, unixSecondsIn(60 * 60));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="aspect-video w-full"
      />
    </div>
  );
}
