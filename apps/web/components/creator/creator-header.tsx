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
    <Card className="overflow-hidden">
      <div className="relative h-40 w-full bg-gradient-to-r from-[var(--accent)]/35 via-[var(--accent)]/15 to-sky-400/20 sm:h-56">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={`${title} cover`} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="px-6 pb-6">
        <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-zinc-200 shadow-sm dark:border-zinc-900 dark:bg-zinc-800">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`${title} avatar`} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Creator page</p>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {tagline ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{tagline}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">@{slug}</Badge>
            {ownerView ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Edit profile</Link>
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
