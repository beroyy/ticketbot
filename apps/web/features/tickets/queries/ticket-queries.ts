import { api } from "@/lib/api";
import { ticketKeys } from "./query-keys";
import type { Ticket } from "../types";

/**
 * Query objects for ticket-related data fetching
 * These are plain objects that can be used with useQuery
 */
export const ticketQueries = {
  /**
   * Fetch all tickets for a guild
   * Filters are applied client-side for better performance
   */
  all: (guildId: string | null) => ({
    queryKey: ticketKeys.list(guildId),
    queryFn: async (): Promise<Ticket[]> => {
      if (!guildId) return [];
      const res = await api.tickets.$get({ query: { guildId } });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!guildId,
    placeholderData: (previousData: Ticket[] | undefined) => previousData,
  }),

  /**
   * Fetch a single ticket by ID
   */
  detail: (ticketId: string, guildId: string | null) => ({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: async (): Promise<Ticket | null> => {
      if (!guildId || !ticketId) return null;
      const res = await api.tickets[":id"].$get({ 
        param: { id: encodeURIComponent(ticketId) } 
      });
      if (!res.ok) throw new Error("Failed to fetch ticket details");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!guildId && !!ticketId,
  }),

  /**
   * Fetch ticket statistics for a guild
   */
  stats: (guildId: string | null) => ({
    queryKey: ticketKeys.stats(guildId),
    queryFn: async () => {
      if (!guildId) return null;
      const res = await api.tickets.statistics[":guildId"].$get({ 
        param: { guildId } 
      });
      if (!res.ok) throw new Error("Failed to fetch ticket stats");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!guildId,
  }),

  /**
   * Fetch messages for a ticket
   */
  messages: (ticketId: string, guildId: string | null, refetchInterval?: number | false) => ({
    queryKey: ticketKeys.messages(ticketId, guildId),
    queryFn: async () => {
      if (!guildId) throw new Error("Guild ID is required");
      const encodedId = encodeURIComponent(ticketId);
      const res = await api.tickets[":id"].messages.$get({ 
        param: { id: encodedId },
        query: { guildId }
      });
      if (!res.ok) throw new Error("Failed to fetch ticket messages");
      return res.json();
    },
    enabled: !!ticketId && !!guildId,
    refetchInterval: refetchInterval ?? 5000,
    staleTime: 2000,
  }),
};