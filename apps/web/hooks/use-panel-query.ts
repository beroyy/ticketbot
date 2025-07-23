import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { panelQueries, panelMutations, type Panel } from "@/features/panels/queries";
import type { CreatePanelDto, UpdatePanelDto } from "@/features/panels/types";

// Panel schema for validation
const PanelSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  type: z.enum(["SINGLE", "MULTI"]),
  title: z.string(),
  content: z.string().optional(),
  channelId: z.string(),
  categoryId: z.string().optional(),
  formId: z.number().optional(),
  emoji: z.string().optional(),
  buttonText: z.string(),
  color: z.string().optional(),
  welcomeMessage: z.string().optional(),
  introTitle: z.string().optional(),
  introDescription: z.string().optional(),
  channelPrefix: z.string().optional(),
  mentionRoles: z.string().optional(),
  supportTeamRoles: z.string().optional(),
  parentPanelId: z.number().optional(),
  orderIndex: z.number(),
  enabled: z.boolean(),
  permissions: z.string().optional(),
  messageId: z.string().optional(),
  deployedAt: z.string().optional(),
  form: z.any().optional(),
  channel: z.string(),
});

// Query hooks
export function usePanelQuery(panelId: string) {
  return useQuery({
    ...panelQueries.detail(panelId),
    select: (data) => PanelSchema.parse(data),
  });
}

export function usePanelsQuery(guildId: string | null) {
  return useQuery({
    ...panelQueries.list(guildId),
    select: (data) => z.array(PanelSchema).parse(data),
  });
}

// Mutation hooks with optimistic updates
export function useCreatePanelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: panelMutations.create,
    onMutate: async (newPanel: CreatePanelDto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["panels", "list", newPanel.guildId] });

      // Snapshot the previous value
      const previousPanels = queryClient.getQueryData<Panel[]>([
        "panels",
        "list",
        newPanel.guildId,
      ]);

      // Optimistically update to the new value
      if (previousPanels) {
        queryClient.setQueryData<Panel[]>(
          ["panels", "list", newPanel.guildId],
          [
            ...previousPanels,
            {
              ...newPanel,
              id: `temp-${Date.now()}`,
              title: newPanel.singlePanel.title,
              buttonText: newPanel.singlePanel.buttonText || "",
              orderIndex: 0,
              enabled: true,
              channel: newPanel.channelId,
            } as Panel,
          ]
        );
      }

      return { previousPanels };
    },
    onError: (err, newPanel, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPanels) {
        queryClient.setQueryData(["panels", "list", newPanel.guildId], context.previousPanels);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["panels", "list", variables.guildId] });
    },
  });
}

export function useUpdatePanelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ panelId, data }: { panelId: string; data: UpdatePanelDto }) =>
      panelMutations.update(panelId, data),
    onMutate: async ({ panelId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["panels", "detail", panelId] });

      const previousPanel = queryClient.getQueryData<Panel>(["panels", "detail", panelId]);

      if (previousPanel) {
        queryClient.setQueryData<Panel>(["panels", "detail", panelId], {
          ...previousPanel,
          ...data,
        } as Panel);
      }

      return { previousPanel };
    },
    onError: (err, { panelId }, context) => {
      if (context?.previousPanel) {
        queryClient.setQueryData(["panels", "detail", panelId], context.previousPanel);
      }
    },
    onSettled: (data, error, { panelId }) => {
      queryClient.invalidateQueries({ queryKey: ["panels", "detail", panelId] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["panels", "list", data.guildId] });
      }
    },
  });
}

export function useDeletePanelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: panelMutations.delete,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["panels"] });
    },
  });
}

export function useDeployPanelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: panelMutations.deploy,
    onSuccess: (data) => {
      queryClient.setQueryData(["panels", "detail", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["panels", "list", data.guildId] });
    },
  });
}
