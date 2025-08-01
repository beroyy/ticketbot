import { create } from "zustand";
import { devtools } from "zustand/middleware";

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

type TicketsUIState = {
  searchQuery: string;
  activeTab: "active" | "closed";
  selectedTicketId: string | null;
  isCollapsed: boolean;
  filters: FilterState;
  sort: SortState;

  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: "active" | "closed") => void;
  setSelectedTicketId: (id: string | null) => void;
  setCollapsed: (collapsed: boolean) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setSort: (sort: Partial<SortState>) => void;
  clearFilters: () => void;
};

const defaultFilters: FilterState = {
  status: [],
  type: [],
  assignee: [],
  dateRange: { from: null, to: null },
};

const defaultSort: SortState = {
  field: "createdAt",
  direction: "desc",
};

export const useTicketsUIStore = create<TicketsUIState>()(
  devtools(
    (set) => ({
      searchQuery: "",
      activeTab: "active",
      selectedTicketId: null,
      isCollapsed: false,
      filters: defaultFilters,
      sort: defaultSort,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedTicketId: (id) => set({ selectedTicketId: id }),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      setSort: (sort) => set((state) => ({ sort: { ...state.sort, ...sort } })),
      clearFilters: () => set({ filters: defaultFilters }),
    }),
    {
      name: "tickets-ui-store",
    }
  )
);

export const useTicketSearch = () => useTicketsUIStore((state) => state.searchQuery);
export const useActiveTab = () => useTicketsUIStore((state) => state.activeTab);
export const useSelectedTicket = () => useTicketsUIStore((state) => state.selectedTicketId);
export const useTicketCollapsed = () => useTicketsUIStore((state) => state.isCollapsed);
export const useTicketFilters = () => useTicketsUIStore((state) => state.filters);
export const useTicketSort = () => useTicketsUIStore((state) => state.sort);

export const useTicketUIActions = () => {
  const setSearchQuery = useTicketsUIStore((state) => state.setSearchQuery);
  const setActiveTab = useTicketsUIStore((state) => state.setActiveTab);
  const setSelectedTicketId = useTicketsUIStore((state) => state.setSelectedTicketId);
  const setCollapsed = useTicketsUIStore((state) => state.setCollapsed);
  const setFilters = useTicketsUIStore((state) => state.setFilters);
  const setSort = useTicketsUIStore((state) => state.setSort);
  const clearFilters = useTicketsUIStore((state) => state.clearFilters);

  return {
    setSearchQuery,
    setActiveTab,
    setSelectedTicketId,
    setCollapsed,
    setFilters,
    setSort,
    clearFilters,
  };
};

export type { FilterState, SortState };
