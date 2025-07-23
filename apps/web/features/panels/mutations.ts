import { useMutation, useQueryClient } from "@tanstack/react-query";
import { panelMutations, type Panel } from "./queries";
import type { CreatePanelDto, UpdatePanelDto } from "./types";

interface CreatePanelResponse {
  panel: Panel;
  warning?: string;
}

interface UsePanelMutationsOptions {
  onCreateSuccess?: (data: CreatePanelResponse) => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function usePanelMutations(options?: UsePanelMutationsOptions) {
  const queryClient = useQueryClient();

  const createPanelMutation = useMutation({
    mutationFn: async (data: CreatePanelDto) => {
      const panel = await panelMutations.create(data);
      return { panel } as CreatePanelResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["panels"] });
      options?.onCreateSuccess?.(data);
    },
  });

  const updatePanelMutation = useMutation({
    mutationFn: ({ panelId, data }: { panelId: string; data: UpdatePanelDto }) =>
      panelMutations.update(panelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panels"] });
      options?.onUpdateSuccess?.();
    },
  });

  const deletePanelMutation = useMutation({
    mutationFn: (panelId: string) => panelMutations.delete(panelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panels"] });
      options?.onDeleteSuccess?.();
    },
  });

  return {
    createPanel: createPanelMutation,
    updatePanel: updatePanelMutation,
    deletePanel: deletePanelMutation,
  };
}
