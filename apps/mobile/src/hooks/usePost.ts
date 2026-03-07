import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePost(postId: string | undefined, creatorSlug?: string) {
  return useQuery({
    queryKey: ["post", postId, creatorSlug ?? null],
    queryFn: () => api.getPostById(postId ?? "", { creatorSlug }),
    enabled: Boolean(postId),
  });
}
