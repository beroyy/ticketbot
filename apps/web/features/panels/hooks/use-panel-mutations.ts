import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { notify } from "@/shared/stores/app-store";
import type { CreatePanelDto, UpdatePanelDto } from "@/features/panels/types";

interface PanelResponse {
  id: string;
  title: string;
  channelId: string;
  guildId: string;
  [key: string]: unknown;
}

interface UsePanelMutationsOptions {
  onCreateSuccess?: (data: PanelResponse) => void;
  onCreateError?: (error: Error) => void;
  onUpdateSuccess?: (data: PanelResponse) => void;
  onUpdateError?: (error: Error) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
  onDeploySuccess?: () => void;
  onDeployError?: (error: Error) => void;
}

export const usePanelMutations = (options?: UsePanelMutationsOptions): any => {
  const queryClient = useQueryClient();
  const { selectedGuildId } = useSelectServer();

  const createPanel = useMutation({
    mutationFn: async (data: CreatePanelDto) => {
      return apiClient.post("/panels", data);
    },
    onSuccess: (data) => {
      // Invalidate panels query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
      notify.success("Panel created", "Your panel has been created successfully");
      options?.onCreateSuccess?.(data as any);
    },
    onError: (error: Error) => {
      console.error("Failed to create panel:", error);
      notify.error("Failed to create panel", error.message || "An error occurred");
      options?.onCreateError?.(error);
    },
  });

  const updatePanel = useMutation({
    mutationFn: async ({ panelId, data }: { panelId: string; data: UpdatePanelDto }) => {
      return apiClient.post(`/panels/${panelId}`, {
        ...data,
        guildId: selectedGuildId,
      });
    },
    onSuccess: (data) => {
      // Invalidate panels query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
      notify.success("Panel updated", "Your panel has been updated successfully");
      options?.onUpdateSuccess?.(data as any);
    },
    onError: (error: Error) => {
      console.error("Failed to update panel:", error);
      notify.error("Failed to update panel", error.message || "An error occurred");
      options?.onUpdateError?.(error);
    },
  });

  const deletePanel = useMutation({
    mutationFn: async (panelId: string) => {
      return apiClient.request(`/panels/${panelId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Invalidate panels query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
      notify.success("Panel deleted", "Your panel has been deleted successfully");
      options?.onDeleteSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Failed to delete panel:", error);
      notify.error("Failed to delete panel", error.message || "An error occurred");
      options?.onDeleteError?.(error);
    },
  });

  const deployPanel = useMutation({
    mutationFn: async (panelId: string) => {
      return apiClient.post(`/panels/${panelId}/deploy`);
    },
    onSuccess: () => {
      // Invalidate panels query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
      notify.success("Panel deployed", "Your panel has been deployed to Discord");
      options?.onDeploySuccess?.();
    },
    onError: (error: Error) => {
      console.error("Failed to deploy panel:", error);
      notify.error("Failed to deploy panel", error.message || "An error occurred");
      options?.onDeployError?.(error);
    },
  });

  return {
    createPanel,
    updatePanel,
    deletePanel,
    deployPanel,
  };
};
