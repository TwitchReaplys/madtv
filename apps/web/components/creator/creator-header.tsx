import type { ComponentType } from "react";
import Link from "next/link";
import { Globe, Instagram, Music2, Youtube } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
};

type CreatorHeaderProps = {
  slug: string;
  title: string;
  tagline?: string | null;
  about?: string | null;
  coverImageUrl?: string | null;
  avatarUrl?: string | null;
  socialLinks?: SocialLinks | null;
  ownerView?: boolean;
  subscriberCount?: number;
  postCount?: number;
};

const socialConfig: Array<{
  key: keyof SocialLinks;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "website", label: "Web", icon: Globe },
];

export function CreatorHeader({
  slug,
  title,
  tagline,
  about,
  coverImageUrl,
  avatarUrl,
  socialLinks,
  ownerView = false,
  subscriberCount,
  postCount,
}: CreatorHeaderProps) {
  const socialItems = socialConfig
    .map((item) => {
      const rawUrl = socialLinks?.[item.key];
      if (!rawUrl) {
        return null;
      }

      return {
        ...item,
        url: rawUrl,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <Card className="overflow-hidden glass">
      <div className="relative h-48 w-full bg-gradient-to-r from-[var(--accent)]/35 via-[var(--accent)]/15 to-sky-400/20 sm:h-64">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={`${title} cover`} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
      </div>

      <div className="px-6 pb-6">
        <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-[var(--background)] bg-zinc-200 shadow-lg dark:bg-zinc-800">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`${title} avatar`} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              {tagline ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{tagline}</p> : null}
              <div className="mt-2 flex gap-6 text-sm text-zinc-600 dark:text-zinc-300">
                {typeof subscriberCount === "number" ? (
                  <span>
                    <strong className="text-foreground">{subscriberCount}</strong> odběratelů
                  </span>
                ) : null}
                {typeof postCount === "number" ? (
                  <span>
                    <strong className="text-foreground">{postCount}</strong> příspěvků
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">@{slug}</Badge>
            {ownerView ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Upravit profil</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {about ? <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-zinc-600 dark:text-zinc-300">{about}</p> : null}

        {socialItems.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {socialItems.map((item) => (
              <Button key={item.key} asChild variant="outline" size="sm">
                <a href={item.url} target="_blank" rel="noreferrer">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
