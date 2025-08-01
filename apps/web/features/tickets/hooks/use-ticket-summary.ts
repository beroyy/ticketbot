import { useQuery } from "@tanstack/react-query";
import { ticketQueries } from "../queries/ticket-queries";
import { useCallback } from "react";
import type { Ticket } from "../types";

export function useTicketSummary(guildId: string | null) {
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
