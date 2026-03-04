import { Notice } from "@/components/notice";
import { upsertCreatorAction } from "@/lib/actions/dashboard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { supabase, user } = await requireUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, title, about")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Creator profile</h2>
      <p className="mt-2 text-sm text-zinc-600">Create or update your public creator page.</p>

      <div className="mt-4 space-y-3">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />
      </div>

      <form action={upsertCreatorAction} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Slug</label>
          <input
            type="text"
            name="slug"
            required
            defaultValue={creator?.slug ?? ""}
            placeholder="my-channel"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">Lowercase letters, numbers and hyphens only.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            type="text"
            name="title"
            required
            defaultValue={creator?.title ?? ""}
            placeholder="My Creator Brand"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">About</label>
          <textarea
            name="about"
            rows={6}
            defaultValue={creator?.about ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <button type="submit" className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          {creator ? "Save changes" : "Create profile"}
        </button>
      </form>
    </section>
  );
}
