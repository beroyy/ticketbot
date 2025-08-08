/**
 * Centralized query keys for the tickets feature
 * Ensures consistency across queries and mutations
 */
export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (guildId: string | null) => [...ticketKeys.lists(), guildId] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (ticketId: string) => [...ticketKeys.details(), ticketId] as const,
  messages: (ticketId: string, guildId: string | null) =>
    ["ticket-messages", ticketId, guildId] as const,
  stats: (guildId: string | null) => [...ticketKeys.all, "stats", guildId] as const,
};

export const activityKeys = {
  all: ["activity"] as const,
  recent: (guildId: string | null, limit?: number) => ["recent-activity", guildId, limit] as const,
  log: (ticketId: string) => ["activity-log", ticketId] as const,
};

/**
 * Helper to invalidate all ticket-related queries
 */
export function getTicketInvalidationKeys(ticketId?: string) {
  if (ticketId) {
    return [ticketKeys.lists(), ticketKeys.detail(ticketId), ticketKeys.messages(ticketId, null)];
  }
  return [ticketKeys.all];
}
