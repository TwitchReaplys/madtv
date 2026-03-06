import Link from "next/link";

import { Notice } from "@/components/notice";
import { deletePostAction } from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorPostsPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase, creator } = await requireCreatorAccess(creatorId);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, visibility, min_tier_rank, published_at, post_assets ( id, type )")
    .eq("creator_id", creatorId)
    .order("published_at", { ascending: false });

  return (
    <section className="rounded-2xl glass p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Posts · {creator.title}</h2>
        <Link
          href={`/dashboard/creator/${creatorId}/posts/new`}
          className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New post
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />
      </div>

      <div className="mt-4 space-y-3">
        {(posts ?? []).length === 0 ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">No posts yet.</p>
        ) : (
          posts?.map((post) => {
            const assets = Array.isArray(post.post_assets) ? post.post_assets : [];
            const hasVideo = assets.some((asset) => asset.type === "bunny_video");

            return (
              <article key={post.id} className="rounded-md border border-zinc-200/80 p-4 dark:border-zinc-800/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      Visibility: {post.visibility}
                      {post.visibility === "tier" && post.min_tier_rank ? ` (rank ${post.min_tier_rank}+)` : ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(post.published_at).toLocaleString()} · {hasVideo ? "Video attached" : "Text only"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/creator/${creatorId}/posts/${post.id}/edit`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/c/${creator.slug}/posts/${post.id}`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      View
                    </Link>
                    <form action={deletePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/posts`} />
                      <button
                        type="submit"
                        className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
