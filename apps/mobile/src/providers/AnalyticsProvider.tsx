import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";

import { createAnalyticsClient, type AnalyticsClient, type AnalyticsEventName, type AnalyticsPayload } from "@/lib/analytics";

type AnalyticsContextValue = {
  track: (event: AnalyticsEventName, payload?: AnalyticsPayload) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

type AnalyticsProviderProps = {
  children: ReactNode;
};

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const analyticsClient = useMemo<AnalyticsClient>(() => createAnalyticsClient(), []);

  useEffect(() => {
    analyticsClient.track("app_opened", {
      platform: "mobile",
      opened_at: new Date().toISOString(),
    });
  }, [analyticsClient]);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      track: analyticsClient.track,
    }),
    [analyticsClient],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error("useAnalyticsContext must be used within AnalyticsProvider");
  }

  return context;
}
