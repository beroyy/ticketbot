import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

interface PreferenceResponse {
  value: any;
}

interface SetPreferenceData {
  key: string;
  value: any;
}

export function useUserPreference<T = any>(key: string, defaultValue?: T) {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  // Query for getting preference
  const { data, isLoading } = useQuery({
    queryKey: ["user", "preference", key],
    queryFn: async (): Promise<T | null> => {
      if (!session?.user) return null;

      try {
        const res = await api.user.preferences[":key"].$get({
          param: { key },
        });
        if (!res.ok) throw new Error("Failed to fetch preference");
        const data = await res.json();
        return data.value ?? defaultValue ?? null;
      } catch (error) {
        console.error("Failed to fetch preference:", error);
        return defaultValue ?? null;
      }
    },
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for setting preference
  const setMutation = useMutation({
    mutationFn: async (value: T) => {
      const payload: SetPreferenceData = { key, value };
      const res = await api.user.preferences.$post({ json: payload });
      if (!res.ok) throw new Error("Failed to set preference");
    },
    onSuccess: (_, value) => {
      // Update the cache immediately
      queryClient.setQueryData(["user", "preference", key], value);
    },
  });

  // Mutation for deleting preference
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.user.preferences[":key"].$delete({ param: { key } });
      if (!res.ok) throw new Error("Failed to delete preference");
    },
    onSuccess: () => {
      // Clear from cache
      queryClient.setQueryData(["user", "preference", key], null);
    },
  });

  return {
    value: data ?? defaultValue,
    isLoading,
    setValue: setMutation.mutate,
    deleteValue: deleteMutation.mutate,
    isSettingValue: setMutation.isPending,
    isDeletingValue: deleteMutation.isPending,
  };
}
