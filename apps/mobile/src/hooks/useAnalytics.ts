import { useAnalyticsContext } from "@/providers/AnalyticsProvider";

export function useAnalytics() {
  return useAnalyticsContext();
}
