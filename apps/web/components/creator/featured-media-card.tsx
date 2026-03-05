"use client";

import { useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FeaturedMediaCardProps = {
  creatorId: string;
  creatorTitle: string;
  mediaType: "none" | "bunny_video" | "image";
  libraryId: string;
  featuredVideoId?: string | null;
  featuredThumbnailUrl?: string | null;
  featuredImageUrl?: string | null;
  coverImageUrl?: string | null;
};

async function trackEvent(payload: { creatorId: string; eventType: "video_play_intent" | "video_play_started"; meta?: Record<string, unknown> }) {
  await fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventType: payload.eventType,
      creatorId: payload.creatorId,
      meta: payload.meta ?? {},
    }),
  }).catch(() => {
    // Non-blocking analytics tracking.
  });
}

export function FeaturedMediaCard({
  creatorId,
  creatorTitle,
  mediaType,
  libraryId,
  featuredVideoId,
  featuredThumbnailUrl,
  featuredImageUrl,
  coverImageUrl,
}: FeaturedMediaCardProps) {
  const [open, setOpen] = useState(false);
  const [playStarted, setPlayStarted] = useState(false);

  const previewImage = useMemo(() => {
    if (mediaType === "image") {
      return featuredImageUrl || coverImageUrl || null;
    }

    return featuredThumbnailUrl || coverImageUrl || null;
  }, [coverImageUrl, featuredImageUrl, featuredThumbnailUrl, mediaType]);

  if (mediaType === "none") {
    return null;
  }

  if (mediaType === "image") {
    return (
      <section className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Featured</h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {previewImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewImage} alt={`${creatorTitle} featured`} className="aspect-[16/9] w-full object-cover" />
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
          )}
        </div>
      </section>
    );
  }

  if (!featuredVideoId || !libraryId) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xl font-bold tracking-tight">Featured media</h2>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            void trackEvent({
              creatorId,
              eventType: "video_play_intent",
              meta: { surface: "creator_featured_media" },
            });
          } else {
            setPlayStarted(false);
          }
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="group relative block w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-left dark:border-zinc-800 dark:bg-zinc-900"
          >
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewImage} alt={`${creatorTitle} intro preview`} className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            ) : (
              <div className="aspect-[16/9] w-full bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
            )}
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm">
                <PlayCircle className="h-4 w-4" />
                Přehrát intro
              </div>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl p-4">
          <DialogHeader>
            <DialogTitle>{creatorTitle} · Intro video</DialogTitle>
            <DialogDescription>Video se načte až po tvém kliknutí.</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl">
            <iframe
              title={`${creatorTitle} featured video`}
              src={`https://iframe.mediadelivery.net/embed/${libraryId}/${featuredVideoId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="aspect-video w-full"
              onLoad={() => {
                if (!playStarted) {
                  setPlayStarted(true);
                  void trackEvent({
                    creatorId,
                    eventType: "video_play_started",
                    meta: { surface: "creator_featured_media" },
                  });
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
