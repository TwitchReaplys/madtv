import { Notice } from "@/components/notice";
import { toggleUserBanAction } from "@/lib/actions/admin";
import { requirePlatformAdmin } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getQuery(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;
  const search = getQuery(query.q);

  const { supabase } = await requirePlatformAdmin();
  let usersQuery = supabase
    .from("profiles")
    .select("id, username, display_name, created_at, is_banned")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    usersQuery = usersQuery.or(
      `username.ilike.%${search.replace(/[%_,]/g, "")}%,display_name.ilike.%${search.replace(/[%_,]/g, "")}%`,
    );
  }

  const { data: users } = await usersQuery;
  const userIds = (users ?? []).map((user) => user.id);
  const { data: subscriptions } =
    userIds.length > 0
      ? await supabase
          .from("subscriptions")
          .select("user_id, status")
          .in("user_id", userIds)
      : { data: [] as { user_id: string; status: string }[] };

  const subscriptionMap = (subscriptions ?? []).reduce(
    (acc, row) => {
      const current = acc.get(row.user_id) ?? { total: 0, active: 0 };
      current.total += 1;
      if (["active", "trialing"].includes(row.status)) {
        current.active += 1;
      }
      acc.set(row.user_id, current);
      return acc;
    },
    new Map<string, { total: number; active: number }>(),
  );

  return (
    <section className="space-y-4">
      <Notice message={success} variant="success" />
      <Notice message={error} variant="error" />

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search username/display name"
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          Search
        </button>
      </form>

      <div className="space-y-3">
        {(users ?? []).map((user) => (
          <div key={user.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{user.display_name || user.username || user.id}</p>
                <p className="text-xs text-zinc-500">{user.id}</p>
                <p className="text-xs text-zinc-500">
                  Subs: {subscriptionMap.get(user.id)?.active ?? 0} active / {subscriptionMap.get(user.id)?.total ?? 0} total
                </p>
              </div>
              <form action={toggleUserBanAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="nextBanned" value={user.is_banned ? "false" : "true"} />
                <button
                  type="submit"
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    user.is_banned
                      ? "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                      : "border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  }`}
                >
                  {user.is_banned ? "Unban" : "Ban"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
