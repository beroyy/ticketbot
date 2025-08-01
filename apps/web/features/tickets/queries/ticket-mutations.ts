import { api } from "@/lib/api";

/**
 * Mutation objects for ticket operations
 * These are plain objects that can be used with useMutation
 */
export const ticketMutations = {
  /**
   * Claim a ticket
   */
  claim: (ticketId: string) => ({
    mutationFn: async (): Promise<unknown> => {
      const res = await api.tickets[":id"].claim.$post({
        param: { id: encodeURIComponent(ticketId) },
      });
      if (!res.ok) throw new Error("Failed to claim ticket");
      return res.json();
    },
  }),

  /**
   * Close a ticket with optional reason
   */
  close: (ticketId: string) => ({
    mutationFn: async (reason?: string): Promise<unknown> => {
      const res = await api.tickets[":id"].close.$post({
        param: { id: encodeURIComponent(ticketId) },
        json: reason ? { reason } : undefined,
      });
      if (!res.ok) throw new Error("Failed to close ticket");
      return res.json();
    },
  }),

  /**
   * Unclaim a ticket
   */
  unclaim: (ticketId: string) => ({
    mutationFn: async (): Promise<unknown> => {
      const res = await api.tickets[":id"].unclaim.$post({
        param: { id: encodeURIComponent(ticketId) },
      });
      if (!res.ok) throw new Error("Failed to unclaim ticket");
      return res.json();
    },
  }),

  /**
   * Send a message to a ticket
   */
  sendMessage: (ticketId: string) => ({
    mutationFn: async (message: string): Promise<unknown> => {
      const res = await api.tickets[":id"].messages.$post({
        param: { id: encodeURIComponent(ticketId) },
        json: { content: message },
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
  }),
};