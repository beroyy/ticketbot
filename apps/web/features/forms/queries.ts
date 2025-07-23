import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface FormResponse {
  id: number;
  name: string;
  guildId: string;
  fields: Array<{
    id: number;
    formId: number;
    type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    orderIndex: number;
    validationRules?: string;
    options?: string;
  }>;
}

async function fetchForms(guildId: string): Promise<FormResponse[]> {
  const params = new URLSearchParams({ guildId });
  return apiClient.get<FormResponse[]>(`/forms?${params}`);
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
