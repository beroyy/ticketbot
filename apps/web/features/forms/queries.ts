import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

async function fetchForms(guildId: string) {
  const res = await api.forms.$get({ query: { guildId } });
  if (!res.ok) throw new Error("Failed to fetch forms");
  return res.json();
}

export const formsQueries = {
  list: (guildId: string | null) => ({
    queryKey: ["forms", guildId],
    queryFn: () => {
      if (!guildId) throw new Error("Guild ID is required");
      return fetchForms(guildId);
    },
    enabled: !!guildId,
    staleTime: 60000,
  }),
};

// Export hook
export function useForms(guildId: string | null): any {
  return useQuery(formsQueries.list(guildId));
}
