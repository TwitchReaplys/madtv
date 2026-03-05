import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    .select("id, slug, title, about, accent_color, cover_image_url, avatar_url, seo_description, links")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  const linksValue = Array.isArray(creator?.links)
    ? creator?.links
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const maybeLabel = "label" in item && typeof item.label === "string" ? item.label : "";
          const maybeUrl = "url" in item && typeof item.url === "string" ? item.url : "";

          if (!maybeUrl) {
            return null;
          }

          return maybeLabel ? `${maybeLabel}|${maybeUrl}` : maybeUrl;
        })
        .filter((line): line is string => Boolean(line))
        .join("\n")
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator profile</CardTitle>
        <CardDescription>Create or update your public creator page and branding.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />

        <form action={upsertCreatorAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Slug</label>
              <Input type="text" name="slug" required defaultValue={creator?.slug ?? ""} placeholder="my-channel" />
              <p className="mt-1 text-xs text-zinc-500">Lowercase letters, numbers and hyphens only.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input
                type="text"
                name="title"
                required
                defaultValue={creator?.title ?? ""}
                placeholder="My Creator Brand"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">About</label>
            <Textarea name="about" rows={6} defaultValue={creator?.about ?? ""} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Accent color (HEX)</label>
              <Input name="accentColor" defaultValue={creator?.accent_color ?? "#16a34a"} placeholder="#16a34a" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">SEO description</label>
              <Input
                name="seoDescription"
                defaultValue={creator?.seo_description ?? ""}
                placeholder="Short description for social cards and search"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Cover image URL</label>
              <Input
                name="coverImageUrl"
                defaultValue={creator?.cover_image_url ?? ""}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Avatar image URL</label>
              <Input name="avatarUrl" defaultValue={creator?.avatar_url ?? ""} placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Links (one per line, optional)</label>
            <Textarea
              name="links"
              rows={4}
              defaultValue={linksValue}
              placeholder={"YouTube|https://youtube.com/@handle\\nhttps://instagram.com/handle"}
            />
            <p className="mt-1 text-xs text-zinc-500">Use `Label|URL` or only `URL` per line.</p>
          </div>

          <Button type="submit">{creator ? "Save changes" : "Create profile"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
