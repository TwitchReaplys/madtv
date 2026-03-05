import Link from "next/link";

import { BunnyUploader } from "@/components/bunny-uploader";
import { Notice } from "@/components/notice";
import { createPostAction } from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorNewPostPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const { data: creatorVideos } = await supabase
    .from("creator_videos")
    .select("id, title, bunny_video_id, status")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold">New post · {creator.title}</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Text + optional video from library or direct Bunny upload.
      </p>

      <div className="mt-4 space-y-3">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />
      </div>

      <form action={createPostAction} className="mt-4 space-y-4">
        <input type="hidden" name="creatorId" value={creatorId} />
        <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/posts/new`} />
        <input type="hidden" name="successPath" value={`/dashboard/creator/${creatorId}/posts`} />

        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input type="text" name="title" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Body</label>
          <textarea name="body" rows={8} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Visibility</label>
            <select name="visibility" defaultValue="public" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              <option value="public">Public</option>
              <option value="members">Members</option>
              <option value="tier">Tier minimum rank</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Min tier rank (only for tier visibility)</label>
            <input type="number" name="minTierRank" min={1} step={1} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Attach video from creator library</label>
          <select name="creatorVideoId" defaultValue="" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="">No video</option>
            {(creatorVideos ?? []).map((video) => (
              <option key={video.id} value={video.id}>
                {video.title} ({video.status})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Správa knihovny videí:{" "}
            <Link href={`/dashboard/creator/${creatorId}/videos`} className="underline">
              /videos
            </Link>
          </p>
        </div>

        <BunnyUploader title="Optional direct Bunny video upload" creatorId={creatorId} />

        <button type="submit" className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          Publish post
        </button>
      </form>
    </section>
  );
}
