import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api.getCurrentSubscriptions(),
  });
}
