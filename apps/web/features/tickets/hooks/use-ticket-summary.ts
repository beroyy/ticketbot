import { useQuery } from "@tanstack/react-query";
import { ticketQueries } from "../queries";
import { useCallback } from "react";
import type { Ticket } from "../types";

/**
 * Hook that provides ticket counts using a single query
 * Uses select option for performance optimization
 */
export function useTicketSummary(guildId: string | null) {
  // Memoize selector to only recalculate when tickets change
  const selectCounts = useCallback((tickets: Ticket[]) => {
    const all = tickets || [];
    return {
      activeCount: all.filter((t) => t.status === "open").length,
      closedCount: all.filter((t) => t.status === "closed").length,
      totalCount: all.length,
    };
  }, []);

  const query = useQuery({
    ...ticketQueries.all(guildId),
    select: selectCounts,
  });

  return {
    activeCount: query.data?.activeCount || 0,
    closedCount: query.data?.closedCount || 0,
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
  };
}
