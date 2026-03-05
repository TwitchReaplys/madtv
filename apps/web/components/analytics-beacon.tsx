"use client";

import { useEffect } from "react";

type AnalyticsBeaconProps = {
  eventType: "post_view" | "video_play_intent" | "video_play_started";
  creatorId: string;
  postId?: string;
  assetId?: string;
  meta?: Record<string, unknown>;
};

export function AnalyticsBeacon({ eventType, creatorId, postId, assetId, meta }: AnalyticsBeaconProps) {
  useEffect(() => {
    void fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        creatorId,
        postId,
        assetId,
        meta: meta ?? {},
      }),
    }).catch(() => {
      // Best-effort analytics event.
    });
  }, [assetId, creatorId, eventType, meta, postId]);

  return null;
}
