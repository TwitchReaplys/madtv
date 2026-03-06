import { BunnyUploader } from "@/components/bunny-uploader";
import { Notice } from "@/components/notice";
import { upsertCreatorVideoAction } from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorVideosPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const { data: videos } = await supabase
    .from("creator_videos")
    .select("id, title, bunny_video_id, status, thumbnail_url, duration_seconds, created_at")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">Video knihovna · {creator.title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Nahraj video přes Bunny a ulož ho do knihovny tvůrce.
        </p>

        <div className="mt-4 space-y-3">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />
        </div>

        <form action={upsertCreatorVideoAction} className="mt-4 space-y-4">
          <input type="hidden" name="creatorId" value={creatorId} />
          <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/videos`} />

          <div>
            <label className="mb-1 block text-sm font-medium">Název videa</label>
            <input
              type="text"
              name="title"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Vlastní thumbnail URL (volitelné)</label>
            <input
              type="url"
              name="thumbnailUrl"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="https://..."
            />
          </div>

          <BunnyUploader title="Bunny upload" creatorId={creatorId} />

          <button
            type="submit"
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Uložit video do knihovny
          </button>
        </form>
      </section>

      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">Položky knihovny</h2>
        <div className="mt-4 space-y-3">
          {(videos ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">V knihovně zatím nejsou žádná videa.</p>
          ) : (
            videos?.map((video) => (
              <article key={video.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="font-medium">{video.title}</p>
                <p className="text-xs text-zinc-500">Bunny ID: {video.bunny_video_id}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Stav: {video.status}
                  {video.duration_seconds ? ` · ${video.duration_seconds}s` : ""}
                </p>
                {video.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnail_url} alt={video.title} className="mt-2 aspect-video w-full rounded object-cover" />
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
