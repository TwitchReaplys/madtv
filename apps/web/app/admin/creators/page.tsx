import { Notice } from "@/components/notice";
import { toggleCreatorFeaturedAction, updateCreatorStatusAction } from "@/lib/actions/admin";
import { requirePlatformAdmin } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCreatorsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase } = await requirePlatformAdmin();
  const { data: creators } = await supabase
    .from("creators")
    .select("id, slug, title, status, is_featured, created_at")
    .order("created_at", { ascending: false });

  return (
    <section className="space-y-4">
      <Notice message={success} variant="success" />
      <Notice message={error} variant="error" />

      <div className="space-y-3">
        {(creators ?? []).map((creator) => (
          <div key={creator.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{creator.title}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">@{creator.slug}</p>
              </div>
              <form action={updateCreatorStatusAction} className="flex items-center gap-2">
                <input type="hidden" name="creatorId" value={creator.id} />
                <select
                  name="status"
                  defaultValue={creator.status}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                  <option value="disabled">disabled</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Save
                </button>
              </form>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-zinc-500">Featured: {creator.is_featured ? "yes" : "no"}</p>
              <form action={toggleCreatorFeaturedAction}>
                <input type="hidden" name="creatorId" value={creator.id} />
                <input type="hidden" name="nextFeatured" value={creator.is_featured ? "false" : "true"} />
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {creator.is_featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
