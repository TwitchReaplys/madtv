import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePosts(creatorSlug: string | undefined) {
  return useQuery({
    queryKey: ["creator-posts", creatorSlug],
    queryFn: () =>
      api.getCreatorPosts({
        creatorSlug,
      }),
    enabled: Boolean(creatorSlug),
  });
}

export function useRecentPublicPosts(limit = 10) {
  return useQuery({
    queryKey: ["recent-public-posts", limit],
    queryFn: () => api.getRecentPublicPosts({ limit }),
  });
}
