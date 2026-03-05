import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePlatformSettingsAction } from "@/lib/actions/admin";
import { requirePlatformAdmin } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getBooleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function getNumberSetting(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase } = await requirePlatformAdmin();
  const { data: rows } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["platform_fee_percent", "maintenance_mode", "enable_new_creator_signup"]);

  const map = new Map<string, unknown>((rows ?? []).map((row) => [row.key, row.value]));
  const feePercent = getNumberSetting(map.get("platform_fee_percent"), 10);
  const maintenanceMode = getBooleanSetting(map.get("maintenance_mode"), false);
  const enableNewCreatorSignup = getBooleanSetting(map.get("enable_new_creator_signup"), true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />

        <form action={updatePlatformSettingsAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Platform default fee percent</label>
            <input
              type="number"
              name="platformFeePercent"
              min={0}
              max={100}
              step="0.1"
              defaultValue={feePercent}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Použije se jako fallback. Primární fee se nastavuje per tvůrce v Admin → Creators.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Maintenance mode</label>
            <select
              name="maintenanceMode"
              defaultValue={maintenanceMode ? "true" : "false"}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Enable new creator signup</label>
            <select
              name="enableNewCreatorSignup"
              defaultValue={enableNewCreatorSignup ? "true" : "false"}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>

          <Button type="submit">Save settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}
