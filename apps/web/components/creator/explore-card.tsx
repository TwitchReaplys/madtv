import type { CSSProperties, ComponentType } from "react";
import Link from "next/link";
import { Globe, Instagram, Music2, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
};

export type ExploreCreator = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  avatar_url: string | null;
  accent_color: string | null;
  is_featured?: boolean | null;
  active_members_count?: number | null;
  starting_price_cents: number | null;
  currency: string | null;
  social_links: SocialLinks | null;
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

function formatStartingPrice(priceCents: number | null, currency: string | null) {
  if (typeof priceCents !== "number" || !currency) {
    return "Brzy přibude";
  }

  const value = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceCents / 100);

  return `Od ${value}/měs.`;
}

export function ExploreCard({ creator }: { creator: ExploreCreator }) {
  const creatorStyle = {
    "--accent": creator.accent_color || "#7c3aed",
  } as CSSProperties;

  const socialLinks = creator.social_links && typeof creator.social_links === "object" ? creator.social_links : null;

  const socialItems = socialConfig
    .map((item) => {
      const url = socialLinks?.[item.key];
      if (!url) {
        return null;
      }

      return {
        ...item,
        url,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <Card className="overflow-hidden transition-transform duration-200 hover:-translate-y-0.5" style={creatorStyle}>
      <CardHeader className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/15 via-transparent to-sky-500/10" />
        <div className="relative flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-zinc-200 ring-2 ring-[var(--accent)]/30 dark:bg-zinc-800">
            {creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt={`${creator.title} avatar`} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{creator.title}</CardTitle>
            <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">{creator.tagline || "Členství a bonusový obsah."}</p>
            {creator.is_featured ? <p className="mt-1 text-xs font-semibold text-[var(--accent)]">Featured</p> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm font-semibold text-[var(--accent)]">{formatStartingPrice(creator.starting_price_cents, creator.currency)}</p>
        <div className="flex flex-wrap gap-2">
          {socialItems.map((item) => (
            <Button key={item.key} asChild variant="outline" size="sm">
              <a href={item.url} target="_blank" rel="noreferrer" aria-label={item.label}>
                <item.icon className="h-4 w-4" />
              </a>
            </Button>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/c/${creator.slug}`}>Zobrazit</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
