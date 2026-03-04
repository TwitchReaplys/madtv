import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { SubscribeButton } from "@/components/subscribe-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorPublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const checkoutSuccess = query.checkout === "success" ? "Subscription completed. Access should be available shortly." : null;
  const checkoutCancel = query.checkout === "cancel" ? "Checkout was canceled." : null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id, slug, title, about, owner_user_id")
    .eq("slug", slug)
    .single();

  if (creatorError || !creator) {
    notFound();
  }

  const { data: tiers } = await supabase
    .from("tiers")
    .select("id, name, description, price_cents, currency, rank")
    .eq("creator_id", creator.id)
    .eq("is_active", true)
    .order("rank", { ascending: true });

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, body, visibility, min_tier_rank, published_at, post_assets ( id, type, bunny_video_id )")
    .eq("creator_id", creator.id)
    .order("published_at", { ascending: false });

  const isOwner = user?.id === creator.owner_user_id;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Creator</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{creator.title}</h1>
        {creator.about ? <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-zinc-700">{creator.about}</p> : null}
        {isOwner ? (
          <div className="mt-4">
            <Link href="/dashboard" className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100">
              Edit in dashboard
            </Link>
          </div>
        ) : null}
      </section>

      <div className="mt-4 space-y-3">
        <Notice message={checkoutSuccess} variant="success" />
        <Notice message={checkoutCancel} variant="error" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[350px_1fr]">
        <aside className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Membership tiers</h2>
          <div className="mt-4 space-y-3">
            {(tiers ?? []).length === 0 ? (
              <p className="text-sm text-zinc-700">No active tiers.</p>
            ) : (
              tiers?.map((tier) => (
                <article key={tier.id} className="rounded-lg border border-zinc-200 p-4">
                  <h3 className="font-semibold">{tier.name}</h3>
                  <p className="mt-1 text-sm text-zinc-700">Rank {tier.rank}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    {(tier.price_cents / 100).toFixed(2)} {tier.currency} / month
                  </p>
                  {tier.description ? <p className="mt-2 text-sm text-zinc-600">{tier.description}</p> : null}
                  <div className="mt-3">
                    {user ? (
                      <SubscribeButton tierId={tier.id} />
                    ) : (
                      <Link
                        href={`/login?next=${encodeURIComponent(`/c/${creator.slug}`)}`}
                        className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
                      >
                        Login to subscribe
                      </Link>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Posts</h2>
          <div className="mt-4 space-y-4">
            {(posts ?? []).length === 0 ? (
              <p className="text-sm text-zinc-700">No visible posts yet.</p>
            ) : (
              posts?.map((post) => {
                const hasVideo = Array.isArray(post.post_assets)
                  ? post.post_assets.some((asset) => asset.type === "bunny_video")
                  : false;

                return (
                  <article key={post.id} className="rounded-md border border-zinc-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">{post.title}</h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {post.visibility}
                        {post.visibility === "tier" && post.min_tier_rank ? ` ${post.min_tier_rank}+` : ""}
                      </span>
                    </div>
                    {post.body ? (
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{post.body}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-zinc-500">
                      {new Date(post.published_at).toLocaleString()} · {hasVideo ? "Video" : "Text"}
                    </p>
                    <div className="mt-3">
                      <Link
                        href={`/c/${creator.slug}/posts/${post.id}`}
                        className="inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
                      >
                        Open post
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
