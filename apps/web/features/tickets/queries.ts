import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
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
      const params = new URLSearchParams({ guildId });
      return apiClient.get<Ticket[]>(`/tickets?${params}`);
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!guildId,
    placeholderData: (previousData: Ticket[] | undefined) => previousData,
  }),

  detail: (ticketId: string, guildId: string | null) => ({
    queryKey: ["tickets", "detail", ticketId],
    queryFn: async (): Promise<Ticket | null> => {
      if (!guildId || !ticketId) return null;
      return apiClient.get<Ticket>(`/guilds/${guildId}/tickets/${ticketId}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!guildId && !!ticketId,
  }),

  stats: (guildId: string | null) => ({
    queryKey: ["tickets", "stats", guildId],
    queryFn: async (): Promise<TicketStats | null> => {
      if (!guildId) return null;
      return apiClient.get<TicketStats>(`/guilds/${guildId}/tickets/stats`);
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

async function fetchTicketMessages(ticketId: string): Promise<TicketMessagesResponse> {
  return apiClient.get<TicketMessagesResponse>(`/tickets/${encodeURIComponent(ticketId)}/messages`);
}

/**
 * Mutation options for ticket operations
 */
export const ticketMutations = {
  claim: (guildId: string, ticketId: string) => ({
    mutationFn: async (staffId: string): Promise<unknown> => {
      return apiClient.post(`/guilds/${guildId}/tickets/${ticketId}/claim`, { staffId });
    },
  }),

  close: (guildId: string, ticketId: string) => ({
    mutationFn: async (reason?: string): Promise<unknown> => {
      return apiClient.post(`/guilds/${guildId}/tickets/${ticketId}/close`, { reason });
    },
  }),

  assign: (guildId: string, ticketId: string) => ({
    mutationFn: async (assigneeId: string): Promise<unknown> => {
      return apiClient.post(`/guilds/${guildId}/tickets/${ticketId}/assign`, { assigneeId });
    },
  }),
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
  const params = new URLSearchParams({
    guildId,
    limit: String(limit),
  });

  return apiClient.get<RecentActivityEntry[]>(`/tickets/recent-activity?${params}`);
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
