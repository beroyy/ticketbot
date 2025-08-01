import { api } from "@/lib/api";
import { activityKeys } from "./query-keys";

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

/**
 * Query objects for activity-related data fetching
 */
export const activityQueries = {
  /**
   * Fetch recent activity for a guild
   */
  recent: (guildId: string | null, limit: number = 10) => ({
    queryKey: activityKeys.recent(guildId, limit),
    queryFn: async (): Promise<RecentActivityEntry[]> => {
      if (!guildId) throw new Error("Guild ID is required");
      const res = await api.tickets["recent-activity"].$get({
        query: { guildId, limit: limit.toString() },
      });
      if (!res.ok) throw new Error("Failed to fetch recent activity");
      return res.json();
    },
    enabled: !!guildId,
    refetchInterval: 30000,
    staleTime: 15000,
  }),

  /**
   * Fetch activity log for a specific ticket
   */
  log: (ticketId: string, guildId: string | null) => ({
    queryKey: activityKeys.log(ticketId),
    queryFn: async () => {
      if (!guildId) throw new Error("Guild ID is required");
      const res = await api.tickets[":id"].activity.$get({
        param: { id: encodeURIComponent(ticketId) },
        query: { guildId }
      });
      if (!res.ok) throw new Error("Failed to fetch activity log");
      return res.json();
    },
    enabled: !!ticketId && !!guildId,
    staleTime: 30 * 1000,
  }),
};