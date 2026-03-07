import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useCreator(slug: string | undefined) {
  return useQuery({
    queryKey: ["creator", slug],
    queryFn: () => api.getCreatorBySlug(slug ?? ""),
    enabled: Boolean(slug),
  });
}
