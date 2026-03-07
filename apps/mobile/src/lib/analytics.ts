export type AnalyticsEventName =
  | "app_opened"
  | "creator_viewed"
  | "post_viewed"
  | "video_started"
  | "video_completed"
  | "paywall_viewed"
  | "checkout_cta_tapped";

export type AnalyticsPayload = Record<string, unknown>;

export type AnalyticsClient = {
  track: (event: AnalyticsEventName, payload?: AnalyticsPayload) => void;
};

export function createAnalyticsClient(): AnalyticsClient {
  return {
    track(event, payload) {
      if (__DEV__) {
        // MVP stub. Replace with Segment/PostHog/etc. in next phase.
        // eslint-disable-next-line no-console
        console.log("[analytics]", event, payload ?? {});
      }
    },
  };
}
