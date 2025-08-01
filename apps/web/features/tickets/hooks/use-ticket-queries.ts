import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ticketQueries } from "../queries/ticket-queries";
import type { Ticket } from "@/features/tickets/types";

type TicketQueriesResult = {
  data: {
    all: Ticket[];
    active: Ticket[];
    closed: Ticket[];
  };
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
};

export function useTicketQueries(guildId: string | null): TicketQueriesResult {
  const query = useQuery(ticketQueries.all(guildId));

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
