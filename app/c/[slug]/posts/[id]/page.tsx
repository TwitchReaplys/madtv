import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoEmbed } from "@/components/video-embed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function CreatorPostDetailPage({ params }: PageProps) {
  const { slug, id } = await params;

  const supabase = await createServerSupabaseClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select(
      "id, title, body, visibility, min_tier_rank, published_at, creators!inner ( slug, title ), post_assets ( id, type, bunny_video_id, bunny_library_id, storage_path )",
    )
    .eq("id", id)
    .eq("creators.slug", slug)
    .single();

  if (error || !post) {
    notFound();
  }

  const creatorRelation = post.creators as { slug?: string; title?: string } | { slug?: string; title?: string }[] | null;
  const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
  const assets = Array.isArray(post.post_assets) ? post.post_assets : [];

  return (
    <article className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/c/${slug}`} className="text-sm font-medium text-zinc-700 underline">
            ← Back to {creator?.title ?? "creator page"}
          </Link>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
            {post.visibility}
            {post.visibility === "tier" && post.min_tier_rank ? ` ${post.min_tier_rank}+` : ""}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-2 text-xs text-zinc-500">Published {new Date(post.published_at).toLocaleString()}</p>

        {post.body ? <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-zinc-800">{post.body}</div> : null}

        <div className="mt-6 space-y-4">
          {assets.map((asset) => {
            if (asset.type === "bunny_video" && asset.bunny_video_id && asset.bunny_library_id) {
              return (
                <VideoEmbed
                  key={asset.id}
                  libraryId={asset.bunny_library_id}
                  videoId={asset.bunny_video_id}
                  title={post.title}
                  secure={Boolean(process.env.BUNNY_EMBED_TOKEN_KEY)}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
    </article>
  );
}
