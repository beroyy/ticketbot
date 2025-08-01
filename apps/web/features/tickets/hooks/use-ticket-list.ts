import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ticketQueries } from "@/features/tickets/queries";
import {
  useTicketFilters,
  useTicketSort,
  useTicketSearch,
  useSelectedTicket,
  useActiveTab,
} from "@/shared/stores/app-store";
import { filterAndSortTickets } from "@/features/tickets/utils/ticket-filters";
import { useSmartRefetch } from "@/hooks/use-smart-refetch";
import type { Ticket } from "@/features/tickets/types";

export function useTicketList(selectedGuildId: string | null) {
  // UI state from global app store
  const filters = useTicketFilters();
  const sort = useTicketSort();
  const searchQuery = useTicketSearch();
  const selectedTicketId = useSelectedTicket();
  const activeTab = useActiveTab();

  // Use smart refetch for ticket list
  const smartInterval = useSmartRefetch("normal");

  // Query data
  const {
    data: allTickets = [],
    isLoading,
    error,
  } = useQuery({
    ...ticketQueries.all(selectedGuildId),
    refetchInterval: smartInterval,
  });

  // Filter and sort tickets
  const tickets = useMemo(() => {
    const sourceTickets =
      activeTab === "active"
        ? allTickets.filter((t) => t.status !== "CLOSED")
        : allTickets.filter((t) => t.status === "CLOSED");
    return filterAndSortTickets(sourceTickets, filters, sort, searchQuery);
  }, [allTickets, activeTab, filters, sort, searchQuery]);

  // Find selected ticket
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