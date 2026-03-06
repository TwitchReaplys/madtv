import Link from "next/link";
import { Notice } from "@/components/notice";
import { deletePostAction } from "@/lib/actions/dashboard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPostsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { supabase, user } = await requireUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, title")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return (
      <section className="rounded-2xl glass p-6">
        <h2 className="text-lg font-semibold">Posts</h2>
        <p className="mt-2 text-sm text-zinc-700">Create a creator profile first, then you can publish posts.</p>
      </section>
    );
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, visibility, min_tier_rank, published_at, post_assets ( id, type )")
    .eq("creator_id", creator.id)
    .order("published_at", { ascending: false });

  return (
    <section className="rounded-2xl glass p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Posts</h2>
        <Link href="/dashboard/posts/new" className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white">
          New post
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />
      </div>

      <div className="mt-4 space-y-3">
        {(posts ?? []).length === 0 ? (
          <p className="text-sm text-zinc-700">No posts yet.</p>
        ) : (
          posts?.map((post) => {
            const assets = Array.isArray(post.post_assets) ? post.post_assets : [];
            const hasVideo = assets.some((asset) => asset.type === "bunny_video");

            return (
              <article key={post.id} className="rounded-md border border-zinc-200/80 p-4 dark:border-zinc-800/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-zinc-700">
                      Visibility: {post.visibility}
                      {post.visibility === "tier" && post.min_tier_rank ? ` (rank ${post.min_tier_rank}+)` : ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(post.published_at).toLocaleString()} · {hasVideo ? "Video attached" : "Text only"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/posts/${post.id}/edit`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/c/${creator.slug}/posts/${post.id}`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                    >
                      View
                    </Link>
                    <form action={deletePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="returnPath" value="/dashboard/posts" />
                      <button
                        type="submit"
                        className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
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
