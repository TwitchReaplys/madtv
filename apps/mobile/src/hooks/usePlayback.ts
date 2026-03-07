import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useContinueWatching(limit = 12) {
  return useQuery({
    queryKey: ["continue-watching", limit],
    queryFn: () => api.getContinueWatching({ limit }),
  });
}

export function usePlayback(postId: string | undefined) {
  const queryClient = useQueryClient();
  const continueWatchingQuery = useContinueWatching();

  const trackMutation = useMutation({
    mutationFn: async (payload: { positionSeconds: number; durationSeconds?: number | null }) => {
      if (!postId) {
        return null;
      }

      return api.trackPlaybackProgress({
        postId,
        positionSeconds: payload.positionSeconds,
        durationSeconds: payload.durationSeconds ?? null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["continue-watching"],
      });
    },
  });

  const resumePositionSeconds = useMemo(() => {
    if (!postId || !continueWatchingQuery.data) {
      return 0;
    }

    const match = continueWatchingQuery.data.find((item) => item.post_id === postId);
    return match?.position_seconds ?? 0;
  }, [continueWatchingQuery.data, postId]);

  return {
    resumePositionSeconds,
    trackPlaybackProgress: trackMutation.mutateAsync,
    isTracking: trackMutation.isPending,
    continueWatching: continueWatchingQuery.data ?? [],
    isLoadingContinueWatching: continueWatchingQuery.isLoading,
    continueWatchingError: continueWatchingQuery.error,
  };
}
