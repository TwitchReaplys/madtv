import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/portal";

export const dynamic = "force-dynamic";

function getHealthColor(lastSeen: Date | null) {
  if (!lastSeen) {
    return { label: "red", className: "bg-rose-500" };
  }

  const ageMs = Date.now() - lastSeen.getTime();

  if (ageMs <= 90_000) {
    return { label: "green", className: "bg-emerald-500" };
  }

  if (ageMs <= 300_000) {
    return { label: "yellow", className: "bg-amber-500" };
  }

  return { label: "red", className: "bg-rose-500" };
}

export default async function AdminServicesPage() {
  const { supabase } = await requirePlatformAdmin();
  const { data: rows } = await supabase
    .from("service_status")
    .select("service_name, last_seen_at, meta")
    .order("service_name", { ascending: true });

  const webHealth = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/health`, {
    cache: "no-store",
  })
    .then((response) => response.ok)
    .catch(() => false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Web / API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${webHealth ? "bg-emerald-500" : "bg-rose-500"}`} />
            {webHealth ? "healthy" : "unhealthy"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Worker heartbeat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(rows ?? []).length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">No worker heartbeat rows found.</p>
          ) : (
            rows?.map((row) => {
              const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
              const status = getHealthColor(lastSeen);

              return (
                <div key={row.service_name} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${status.className}`} />
                      <p className="font-medium">{row.service_name}</p>
                    </div>
                    <p className="text-xs text-zinc-500">{status.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Last seen: {lastSeen ? lastSeen.toLocaleString() : "never"}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
