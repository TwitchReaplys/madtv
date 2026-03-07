import { router } from "expo-router";

import { AppScreen } from "@/components/AppScreen";
import { EmptyState } from "@/components/EmptyState";

export default function NotFoundScreen() {
  return (
    <AppScreen>
      <EmptyState
        title="Page not found"
        description="This link does not map to a screen in the current mobile build."
        actionLabel="Go home"
        onAction={() => router.replace("/(tabs)/home")}
      />
    </AppScreen>
  );
}
