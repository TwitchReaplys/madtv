import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateViewerProfileAction } from "@/lib/actions/dashboard";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ViewerProfilePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase, user } = await requireDashboardUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <Card className="overflow-hidden glass">
      <CardHeader className="border-b border-zinc-200/70 bg-gradient-to-r from-[var(--accent)]/10 via-sky-500/6 to-transparent dark:border-zinc-800">
        <CardTitle>Profil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />

        <form action={updateViewerProfileAction} className="space-y-4">
          <input type="hidden" name="returnPath" value="/dashboard/viewer/profile" />
          <div>
            <label className="mb-1 block text-sm font-medium">Uživatelské jméno</label>
            <Input name="username" defaultValue={profile?.username ?? ""} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Zobrazované jméno</label>
            <Input name="displayName" defaultValue={profile?.display_name ?? ""} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Avatar URL</label>
            <Input name="avatarUrl" defaultValue={profile?.avatar_url ?? ""} />
          </div>
          <Button type="submit">Uložit profil</Button>
        </form>
      </CardContent>
    </Card>
  );
}
