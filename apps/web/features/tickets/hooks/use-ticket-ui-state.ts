import {
  useTicketSearch,
  useActiveTab,
  useSelectedTicket,
  useTicketFilters,
  useTicketSort,
  useTicketUIActions,
  useTicketCollapsed,
} from "@/features/tickets/stores/tickets-ui-store";
import type { FilterState, SortState } from "@/features/tickets/stores/tickets-ui-store";

type TicketUIStateResult = {
  ui: {
    search: string;
    activeTab: "active" | "closed";
    selectedTicketId: string | null;
    isCollapsed: boolean;
    filters: FilterState;
    sort: SortState;
  };
  actions: {
    setSearch: (query: string) => void;
    setActiveTab: (tab: "active" | "closed") => void;
    selectTicket: (id: string | null) => void;
    setCollapsed: (collapsed: boolean) => void;
    updateFilters: (filters: Partial<FilterState>) => void;
    updateSort: (sort: Partial<SortState>) => void;
    resetFilters: () => void;
  };
};

export function useTicketUIState(): TicketUIStateResult {
  const search = useTicketSearch();
  const activeTab = useActiveTab();
  const selectedTicketId = useSelectedTicket();
  const isCollapsed = useTicketCollapsed();
  const filters = useTicketFilters();
  const sort = useTicketSort();
  const actions = useTicketUIActions();

  return {
    ui: {
      search,
      activeTab,
      selectedTicketId,
      isCollapsed,
      filters,
      sort,
    },
    actions: {
      setSearch: actions.setSearchQuery,
      setActiveTab: actions.setActiveTab,
      selectTicket: actions.setSelectedTicketId,
      setCollapsed: actions.setCollapsed,
      updateFilters: actions.setFilters,
      updateSort: actions.setSort,
      resetFilters: actions.clearFilters,
    },
  };
}
