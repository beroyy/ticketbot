import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Ticket, TicketStats, TicketMessagesResponse } from "./types";

/**
 * Simple ticket queries - plain objects to avoid Next.js type issues
 */
export const ticketQueries = {
  // Fetch all tickets - filter client-side for better performance
  all: (guildId: string | null) => ({
    queryKey: ["tickets", "all", guildId],
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

  detail: (ticketId: string, guildId: string | null) => ({
    queryKey: ["tickets", "detail", ticketId],
    queryFn: async (): Promise<Ticket | null> => {
      if (!guildId || !ticketId) return null;
      const res = await api.tickets[":id"].$get({ param: { id: ticketId } });
      if (!res.ok) throw new Error("Failed to fetch ticket details");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!guildId && !!ticketId,
  }),

  stats: (guildId: string | null) => ({
    queryKey: ["tickets", "stats", guildId],
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

  messages: (ticketId: string) => ({
    queryKey: ["ticket-messages", ticketId],
    queryFn: () => fetchTicketMessages(ticketId),
    enabled: !!ticketId,
    refetchInterval: 5000,
    staleTime: 2000,
  }),
};

async function fetchTicketMessages(ticketId: string) {
  const res = await api.tickets[":id"].messages.$get({ param: { id: ticketId } });
  if (!res.ok) throw new Error("Failed to fetch ticket messages");
  return res.json();
}

/**
 * Mutation options for ticket operations
 */
export const ticketMutations = {
  claim: (ticketId: string) => ({
    mutationFn: async (): Promise<unknown> => {
      const res = await api.tickets[":id"].claim.$post({
        param: { id: ticketId },
      });
      if (!res.ok) throw new Error("Failed to claim ticket");
      return res.json();
    },
  }),

  close: (ticketId: string) => ({
    mutationFn: async (reason?: string): Promise<unknown> => {
      const res = await api.tickets[":id"].close.$post({
        param: { id: ticketId },
        json: reason ? { reason } : undefined,
      });
      if (!res.ok) throw new Error("Failed to close ticket");
      return res.json();
    },
  }),

  // Note: Assignment is done through the update endpoint
};

// Export hooks
export function useTicketStats(guildId: string | null) {
  return useQuery(ticketQueries.stats(guildId));
}

export function useTicketMessages(ticketId: string) {
  return useQuery(ticketQueries.messages(ticketId));
}

export interface RecentActivityEntry {
  id: number;
  event: string;
  timestamp: string;
  ticketId: number;
  performedBy: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

async function fetchRecentActivity(
  guildId: string,
  limit: number = 10
): Promise<RecentActivityEntry[]> {
  const res = await api.tickets["recent-activity"].$get({
    query: { guildId, limit: limit.toString() },
  });
  if (!res.ok) throw new Error("Failed to fetch recent activity");
  return res.json();
}

export const activityQueries = {
  recent: (guildId: string | null, limit: number = 10) => ({
    queryKey: ["recent-activity", guildId, limit],
    queryFn: () => {
      if (!guildId) throw new Error("Guild ID is required");
      return fetchRecentActivity(guildId, limit);
    },
    enabled: !!guildId,
    refetchInterval: 30000,
    staleTime: 15000,
  }),
};

// Export hook
export function useRecentActivity(
  guildId: string | null,
  limit: number = 10
): UseQueryResult<RecentActivityEntry[], Error> {
  return useQuery(activityQueries.recent(guildId, limit));
}
