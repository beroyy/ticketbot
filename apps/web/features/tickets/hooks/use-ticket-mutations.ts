import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { notify } from "@/shared/stores/app-store";
import type { Ticket } from "@/features/tickets/types";

interface CreateTicketData {
  subject: string;
  description: string;
  type: string;
  priority: string;
  category?: string;
  tags?: string[];
}

interface UpdateTicketData extends Partial<CreateTicketData> {
  status?: string;
  assigneeId?: string;
}

interface CloseTicketData {
  reason?: string;
  resolution?: string;
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTicketData) => {
      const response = await apiClient.post<Ticket>("/tickets", data);
      return response;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket created", `Ticket #${ticket.id} has been created`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => {
      notify.error(
        "Failed to create ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTicketData & { id: string }) => {
      const response = await apiClient.patch<Ticket>(`/tickets/${id}`, data);
      return response;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket updated", `Ticket #${ticket.id} has been updated`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", ticket.id] });
    },
    onError: (error) => {
      notify.error(
        "Failed to update ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

export function useCloseTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: CloseTicketData & { id: string }) => {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/close`, data);
      return response;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket closed", `Ticket #${ticket.id} has been closed`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", ticket.id] });
    },
    onError: (error) => {
      notify.error(
        "Failed to close ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

export function useClaimTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/claim`);
      return response;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket claimed", `You have claimed ticket #${ticket.id}`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", ticket.id] });
    },
    onError: (error) => {
      notify.error(
        "Failed to claim ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

export function useUnclaimTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/unclaim`);
      return response;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket unclaimed", `Ticket #${ticket.id} has been unclaimed`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", ticket.id] });
    },
    onError: (error) => {
      notify.error(
        "Failed to unclaim ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/assign`, { userId });
      return response;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket assigned", `Ticket #${ticket.id} has been assigned`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", ticket.id] });
    },
    onError: (error) => {
      notify.error(
        "Failed to assign ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

export function useSendTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const response = await apiClient.post(`/tickets/${id}/messages`, { content: message });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets", variables.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", variables.id] });
    },
    onError: (error) => {
      notify.error(
        "Failed to send message",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}
