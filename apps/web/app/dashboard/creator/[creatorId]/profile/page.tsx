import { notFound } from "next/navigation";

import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCreatorProfileByIdAction } from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreatorProfileByIdPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;

  const { supabase } = await requireCreatorAccess(creatorId);

  const [{ data: creator }, { data: videos }] = await Promise.all([
    supabase
      .from("creators")
      .select(
        "id, slug, title, tagline, about, accent_color, cover_image_url, avatar_url, seo_description, social_links, status, featured_media_type, featured_video_id, featured_thumbnail_url, featured_image_url",
      )
      .eq("id", creatorId)
      .single(),
    supabase
      .from("creator_videos")
      .select("id, title, bunny_video_id, status")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false }),
  ]);

  if (!creator) {
    notFound();
  }

  const socialLinks =
    creator.social_links && typeof creator.social_links === "object" && !Array.isArray(creator.social_links)
      ? (creator.social_links as Record<string, unknown>)
      : {};

  const featuredType =
    creator.featured_media_type === "bunny_video" || creator.featured_media_type === "image"
      ? creator.featured_media_type
      : "none";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator profile</CardTitle>
        <CardDescription>Uprav veřejný profil a featured media blok.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Notice message={success} variant="success" />
        <Notice message={error} variant="error" />

        <form action={updateCreatorProfileByIdAction} className="space-y-4">
          <input type="hidden" name="creatorId" value={creatorId} />
          <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/profile`} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Slug</label>
              <Input name="slug" required defaultValue={creator.slug} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input name="title" required defaultValue={creator.title} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tagline</label>
            <Input name="tagline" defaultValue={creator.tagline ?? ""} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">About</label>
            <Textarea name="about" rows={6} defaultValue={creator.about ?? ""} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Accent color</label>
              <Input name="accentColor" defaultValue={creator.accent_color ?? "#7c3aed"} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Input value={creator.status ?? "active"} readOnly />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Cover image URL</label>
              <Input name="coverImageUrl" defaultValue={creator.cover_image_url ?? ""} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Avatar image URL</label>
              <Input name="avatarUrl" defaultValue={creator.avatar_url ?? ""} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">SEO description</label>
            <Input name="seoDescription" defaultValue={creator.seo_description ?? ""} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Instagram URL</label>
              <Input name="instagramUrl" defaultValue={typeof socialLinks.instagram === "string" ? socialLinks.instagram : ""} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">TikTok URL</label>
              <Input name="tiktokUrl" defaultValue={typeof socialLinks.tiktok === "string" ? socialLinks.tiktok : ""} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">YouTube URL</label>
              <Input name="youtubeUrl" defaultValue={typeof socialLinks.youtube === "string" ? socialLinks.youtube : ""} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Website URL</label>
              <Input name="websiteUrl" defaultValue={typeof socialLinks.website === "string" ? socialLinks.website : ""} />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm font-semibold">Featured media</p>
            <div>
              <label className="mb-1 block text-sm font-medium">Typ</label>
              <select
                name="featuredMediaType"
                defaultValue={featuredType}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="none">None</option>
                <option value="bunny_video">Intro video</option>
                <option value="image">Featured image</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Intro video (z creator library)</label>
              <select
                name="featuredVideoId"
                defaultValue={creator.featured_video_id ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Bez výběru</option>
                {(videos ?? []).map((video) => (
                  <option key={video.id} value={video.bunny_video_id}>
                    {video.title} ({video.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Custom thumbnail URL</label>
                <Input name="featuredThumbnailUrl" defaultValue={creator.featured_thumbnail_url ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Featured image URL</label>
                <Input name="featuredImageUrl" defaultValue={creator.featured_image_url ?? ""} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Custom thumbnail upload (Supabase Storage)</label>
              <Input type="file" accept="image/*" name="featuredThumbnailFile" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Featured image upload (Supabase Storage)</label>
              <Input type="file" accept="image/*" name="featuredImageFile" />
            </div>
          </div>

          <Button type="submit">Uložit změny</Button>
        </form>
      </CardContent>
    </Card>
  );
}
