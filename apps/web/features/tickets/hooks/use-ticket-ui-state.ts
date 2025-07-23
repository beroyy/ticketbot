import {
  useTicketSearch,
  useActiveTab,
  useSelectedTicket,
  useTicketFilters,
  useTicketSort,
  useTicketActions,
} from "@/shared/stores/app-store";

type FilterState = {
  status: string[];
  type: string[];
  assignee: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

type SortState = {
  field: "createdAt" | "status" | "progress" | "lastMessage";
  direction: "asc" | "desc";
};

interface TicketUIStateResult {
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
}

export function useTicketUIState(): TicketUIStateResult {
  const search = useTicketSearch();
  const activeTab = useActiveTab();
  const selectedTicketId = useSelectedTicket();
  const filters = useTicketFilters();
  const sort = useTicketSort();
  const actions = useTicketActions();

  return {
    ui: {
      search,
      activeTab,
      selectedTicketId,
      isCollapsed: false, // This can be added to store if needed
      filters,
      sort,
    },
    actions: {
      setSearch: actions.setSearch,
      setActiveTab: actions.setActiveTab,
      selectTicket: actions.selectTicket,
      setCollapsed: () => {}, // Placeholder - can be implemented if needed
      updateFilters: actions.updateFilters,
      updateSort: actions.updateSort,
      resetFilters: actions.resetFilters,
    },
  };
}
