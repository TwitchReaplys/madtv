import { notFound } from "next/navigation";
import { BunnyUploader } from "@/components/bunny-uploader";
import { Notice } from "@/components/notice";
import { updatePostAction } from "@/lib/actions/dashboard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPostPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase } = await requireUser();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select(
      "id, creator_id, title, body, visibility, min_tier_rank, creators!inner ( slug, title ), post_assets ( id, type, bunny_video_id, bunny_library_id )",
    )
    .eq("id", id)
    .single();

  if (postError || !post) {
    notFound();
  }

  const existingVideo = (Array.isArray(post.post_assets) ? post.post_assets : []).find(
    (asset) => asset.type === "bunny_video",
  );

  return (
    <section className="rounded-2xl glass p-6">
      <h2 className="text-lg font-semibold">Upravit příspěvek</h2>

      <div className="mt-4 space-y-3">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />
      </div>

      <form action={updatePostAction} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="creatorId" value={post.creator_id} />

        <div>
          <label className="mb-1 block text-sm font-medium">Nadpis</label>
          <input
            type="text"
            name="title"
            required
            defaultValue={post.title}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Obsah</label>
          <textarea
            name="body"
            rows={8}
            defaultValue={post.body ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Viditelnost</label>
            <select
              name="visibility"
              defaultValue={post.visibility}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="public">Veřejný</option>
              <option value="members">Pro členy</option>
              <option value="tier">Dle tier ranku</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Minimální tier rank (pro režim tier)</label>
            <input
              type="number"
              name="minTierRank"
              min={1}
              step={1}
              defaultValue={post.min_tier_rank ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <BunnyUploader
          title="Nahradit nebo ponechat Bunny video"
          initialVideoId={existingVideo?.bunny_video_id ?? null}
          initialLibraryId={existingVideo?.bunny_library_id ?? null}
        />

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="removeVideo" value="true" />
          Odstranit existující video (pokud není dodaný nový upload)
        </label>

        <button type="submit" className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Uložit příspěvek
        </button>
      </form>
    </section>
  );
}
