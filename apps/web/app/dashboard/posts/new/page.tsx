import Link from "next/link";
import { BunnyUploader } from "@/components/bunny-uploader";
import { Notice } from "@/components/notice";
import { createPostAction } from "@/lib/actions/dashboard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPostPage({ searchParams }: PageProps) {
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
        <h2 className="text-lg font-semibold">New post</h2>
        <p className="mt-2 text-sm text-zinc-700">
          You need a creator profile first. Go to <Link href="/dashboard/creator" className="underline">Creator profile</Link>.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl glass p-6">
      <h2 className="text-lg font-semibold">New post</h2>
      <p className="mt-2 text-sm text-zinc-600">Create text post with optional Bunny Stream video attachment.</p>

      <div className="mt-4 space-y-3">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />
      </div>

      <form action={createPostAction} className="mt-4 space-y-4">
        <input type="hidden" name="creatorId" value={creator.id} />

        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            type="text"
            name="title"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Body</label>
          <textarea name="body" rows={8} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Visibility</label>
            <select name="visibility" defaultValue="public" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
              <option value="public">Public</option>
              <option value="members">Members</option>
              <option value="tier">Tier minimum rank</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Min tier rank (only for tier visibility)</label>
            <input
              type="number"
              name="minTierRank"
              min={1}
              step={1}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <BunnyUploader title="Optional Bunny video" />

        <button type="submit" className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Publish post
        </button>
      </form>
    </section>
  );
}
