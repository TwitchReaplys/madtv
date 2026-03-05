import { notFound } from "next/navigation";

import { BunnyUploader } from "@/components/bunny-uploader";
import { Notice } from "@/components/notice";
import { updatePostAction } from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorEditPostPage({ params, searchParams }: PageProps) {
  const { creatorId, id } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const [{ data: post, error: postError }, { data: creatorVideos }] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, creator_id, title, body, visibility, min_tier_rank, post_assets ( id, type, bunny_video_id, bunny_library_id, creator_video_id )",
      )
      .eq("id", id)
      .eq("creator_id", creatorId)
      .single(),
    supabase
      .from("creator_videos")
      .select("id, title, status")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false }),
  ]);

  if (postError || !post) {
    notFound();
  }

  const existingVideo = (Array.isArray(post.post_assets) ? post.post_assets : []).find((asset) => asset.type === "bunny_video");

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold">Edit post · {creator.title}</h2>

      <div className="mt-4 space-y-3">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />
      </div>

      <form action={updatePostAction} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="creatorId" value={post.creator_id} />
        <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/posts/${post.id}/edit`} />
        <input type="hidden" name="successPath" value={`/dashboard/creator/${creatorId}/posts`} />

        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input type="text" name="title" required defaultValue={post.title} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Body</label>
          <textarea name="body" rows={8} defaultValue={post.body ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Visibility</label>
            <select name="visibility" defaultValue={post.visibility} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              <option value="public">Public</option>
              <option value="members">Members</option>
              <option value="tier">Tier minimum rank</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Min tier rank</label>
            <input type="number" name="minTierRank" min={1} step={1} defaultValue={post.min_tier_rank ?? ""} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Attach video from creator library</label>
          <select
            name="creatorVideoId"
            defaultValue={existingVideo?.creator_video_id ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">No library video</option>
            {(creatorVideos ?? []).map((video) => (
              <option key={video.id} value={video.id}>
                {video.title} ({video.status})
              </option>
            ))}
          </select>
        </div>

        <BunnyUploader
          title="Replace or keep direct Bunny video"
          creatorId={creatorId}
          initialVideoId={existingVideo?.bunny_video_id ?? null}
          initialLibraryId={existingVideo?.bunny_library_id ?? null}
        />

        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="removeVideo" value="true" />
          Remove existing video (unless a new upload or library item is provided)
        </label>

        <button type="submit" className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          Save post
        </button>
      </form>
    </section>
  );
}
