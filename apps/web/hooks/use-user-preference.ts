import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

interface SetPreferenceData {
  key: string;
  value: any;
}

export function useUserPreference<T = any>(key: string, defaultValue?: T) {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user", "preference", key],
    queryFn: async (): Promise<T | null> => {
      if (!session?.user) return defaultValue ?? null;

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
    staleTime: 5 * 60 * 1000,
    initialData: !session?.user ? (defaultValue ?? null) : undefined,
  });

  const setMutation = useMutation({
    mutationFn: async (value: T) => {
      const payload: SetPreferenceData = { key, value };
      const res = await api.user.preferences.$post({ json: payload });
      if (!res.ok) throw new Error("Failed to set preference");
    },
    onSuccess: (_, value) => {
      queryClient.setQueryData(["user", "preference", key], value);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.user.preferences[":key"].$delete({ param: { key } });
      if (!res.ok) throw new Error("Failed to delete preference");
    },
    onSuccess: () => {
      queryClient.setQueryData(["user", "preference", key], null);
    },
  });

  return {
    value: data ?? defaultValue,
    isLoading: session?.user ? isLoading : false,
    setValue: setMutation.mutate,
    deleteValue: deleteMutation.mutate,
    isSettingValue: setMutation.isPending,
    isDeletingValue: deleteMutation.isPending,
  };
}
