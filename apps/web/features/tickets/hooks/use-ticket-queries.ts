import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ticketQueries } from "../queries";
import type { Ticket } from "@/features/tickets/types";

interface TicketQueriesResult {
  data: {
    all: Ticket[];
    active: Ticket[];
    closed: Ticket[];
  };
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

/**
 * Hook that fetches all tickets and provides filtered views
 * Uses a single query for better performance
 */
export function useTicketQueries(guildId: string | null): TicketQueriesResult {
  // Fetch all tickets in a single query
  const query = useQuery(ticketQueries.all(guildId));

  // Filter tickets client-side
  const data = useMemo(() => {
    const allTickets = query.data || [];
    return {
      all: allTickets,
      active: allTickets.filter((ticket) => ticket.status !== "CLOSED"),
      closed: allTickets.filter((ticket) => ticket.status === "CLOSED"),
    };
  }, [query.data]);

  return {
    data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
