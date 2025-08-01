import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { notify } from "@/shared/stores/app-store";
import { ticketKeys } from "@/features/tickets/queries/query-keys";
import type { Ticket } from "@/features/tickets/types";

type CreateTicketData = Parameters<typeof api.tickets.$post>[0]["json"];
type UpdateTicketData = NonNullable<Parameters<(typeof api.tickets)[":id"]["$put"]>[0]["json"]>;

function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTicketData) => {
      const res = await api.tickets.$post({ json: data });
      if (!res.ok) throw new Error("Failed to create ticket");
      return res.json() as Promise<Ticket>;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket created", `Ticket #${ticket.id} has been created`);
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
    onError: (error) => {
      notify.error(
        "Failed to create ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTicketData & { id: string }) => {
      const res = await api.tickets[":id"].$put({
        param: { id: encodeURIComponent(id) },
        json: data,
      });
      if (!res.ok) throw new Error("Failed to update ticket");
      return res.json() as Promise<Ticket>;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket updated", `Ticket #${ticket.id} has been updated`);
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticket.id) });
    },
    onError: (error) => {
      notify.error(
        "Failed to update ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

function useCloseTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.tickets[":id"].close.$post({
        param: { id: encodeURIComponent(id) },
        json: reason ? { reason } : undefined,
      });
      if (!res.ok) throw new Error("Failed to close ticket");
      return res.json() as Promise<Ticket>;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket closed", `Ticket #${ticket.id} has been closed`);
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticket.id) });
    },
    onError: (error) => {
      notify.error(
        "Failed to close ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

function useClaimTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.tickets[":id"].claim.$post({
        param: { id: encodeURIComponent(id) },
      });
      if (!res.ok) throw new Error("Failed to claim ticket");
      return res.json() as Promise<Ticket>;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket claimed", `You have claimed ticket #${ticket.id}`);
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticket.id) });
    },
    onError: (error) => {
      notify.error(
        "Failed to claim ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

function useUnclaimTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.tickets[":id"].unclaim.$post({
        param: { id: encodeURIComponent(id) },
      });
      if (!res.ok) throw new Error("Failed to unclaim ticket");
      return res.json() as Promise<Ticket>;
    },
    onSuccess: (ticket) => {
      notify.success("Ticket unclaimed", `Ticket #${ticket.id} has been unclaimed`);
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticket.id) });
    },
    onError: (error) => {
      notify.error(
        "Failed to unclaim ticket",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

function useSendTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await api.tickets[":id"].messages.$post({
        param: { id: encodeURIComponent(id) },
        json: { content: message },
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.messages(variables.id, null) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
    onError: (error) => {
      notify.error(
        "Failed to send message",
        error instanceof Error ? error.message : "An error occurred"
      );
    },
  });
}

export {
  useCreateTicket,
  useUpdateTicket,
  useCloseTicket,
  useClaimTicket,
  useUnclaimTicket,
  useSendTicketMessage,
};
