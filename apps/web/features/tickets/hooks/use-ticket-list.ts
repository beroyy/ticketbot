import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ticketQueries } from "@/features/tickets/queries/ticket-queries";
import {
  useTicketFilters,
  useTicketSort,
  useTicketSearch,
  useSelectedTicket,
  useActiveTab,
} from "@/features/tickets/stores/tickets-ui-store";
import { filterAndSortTickets } from "@/features/tickets/utils/ticket-filters";
import { useSmartRefetch } from "@/hooks/use-smart-refetch";

export function useTicketList(selectedGuildId: string | null) {
  const filters = useTicketFilters();
  const sort = useTicketSort();
  const searchQuery = useTicketSearch();
  const selectedTicketId = useSelectedTicket();
  const activeTab = useActiveTab();
  const smartInterval = useSmartRefetch("normal");

  const {
    data: allTickets = [],
    isLoading,
    error,
  } = useQuery({
    ...ticketQueries.all(selectedGuildId),
    refetchInterval: smartInterval,
  });

  const tickets = useMemo(() => {
    const sourceTickets =
      activeTab === "active"
        ? allTickets.filter((t) => t.status !== "CLOSED")
        : allTickets.filter((t) => t.status === "CLOSED");
    return filterAndSortTickets(sourceTickets, filters, sort, searchQuery);
  }, [allTickets, activeTab, filters, sort, searchQuery]);

  const selectedTicket = useMemo(
    () => allTickets.find((t) => t.id === selectedTicketId) || null,
    [allTickets, selectedTicketId]
  );

  return {
    tickets,
    selectedTicket,
    isLoading,
    error,
    filters,
    sort,
    searchQuery,
    selectedTicketId,
    activeTab,
  };
}
