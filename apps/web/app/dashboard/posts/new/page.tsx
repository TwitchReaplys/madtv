import Link from "next/link";

import { BunnyUploader } from "@/components/bunny-uploader";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>Nový příspěvek</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nejdřív je potřeba vytvořit creator profil. Otevři{" "}
          <Link href="/dashboard/creator" className="underline">
            Creator profil
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">Nový příspěvek</h1>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Vytvořit příspěvek</CardTitle>
          <p className="text-sm text-muted-foreground">Textový příspěvek s volitelným Bunny Stream videem.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />

          <form action={createPostAction} className="space-y-4">
            <input type="hidden" name="creatorId" value={creator.id} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nadpis</label>
              <Input type="text" name="title" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Obsah</label>
              <Textarea name="body" rows={8} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Viditelnost</label>
                <select
                  name="visibility"
                  defaultValue="public"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="public">Veřejný</option>
                  <option value="members">Pro členy</option>
                  <option value="tier">Dle tier ranku</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Minimální tier rank (pro režim tier)</label>
                <Input type="number" name="minTierRank" min={1} step={1} />
              </div>
            </div>

            <BunnyUploader title="Volitelné Bunny video" />

            <Button type="submit" className="glow">
              Publikovat příspěvek
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
