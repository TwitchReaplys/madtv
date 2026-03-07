import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

type UseCreatorsOptions = {
  query?: string;
  limit?: number;
};

export function useCreators({ query, limit }: UseCreatorsOptions = {}) {
  return useQuery({
    queryKey: ["creators", query ?? "", limit ?? null],
    queryFn: () => {
      if (query && query.trim().length > 0) {
        return api.searchCreators(query, { limit });
      }

      return api.getFeaturedCreators({ limit });
    },
  });
}
