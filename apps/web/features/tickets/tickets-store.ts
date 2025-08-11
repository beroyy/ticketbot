import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type TicketFilters = {
  status?: string[];
  assignee?: string[];
  type?: string[];
  search?: string;
  dateRange?: {
    from: string | null;
    to: string | null;
  };
};

type TicketsState = {
  filters: TicketFilters;
  selectedTicketId: string | null;
  viewMode: "list" | "kanban";

  setFilters: (filters: TicketFilters | ((filters: TicketFilters) => void)) => void;
  clearFilters: () => void;
  selectTicket: (id: string | null) => void;
  setViewMode: (mode: "list" | "kanban") => void;

  updateFilter: <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => void;
  toggleFilterValue: (key: "status" | "assignee" | "type", value: string) => void;
  updateDateRange: (type: "from" | "to", value: string | null) => void;
  setSearchQuery: (query: string) => void;
};

const defaultFilters: TicketFilters = {
  status: [],
  assignee: [],
  type: [],
  search: "",
  dateRange: {
    from: null,
    to: null,
  },
};

export const useTicketsStore = create<TicketsState>()(
  immer((set) => ({
    filters: defaultFilters,
    selectedTicketId: null,
    viewMode: "list",

    setFilters: (filters) =>
      set((state) => {
        if (typeof filters === "function") {
          filters(state.filters);
        } else {
          state.filters = filters;
        }
      }),

    clearFilters: () =>
      set((state) => {
        state.filters = defaultFilters;
      }),

    selectTicket: (id) =>
      set((state) => {
        state.selectedTicketId = id;
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    updateFilter: (key, value) =>
      set((state) => {
        state.filters[key] = value as any;
      }),

    toggleFilterValue: (key, value) =>
      set((state) => {
        const arr = state.filters[key] || [];
        const index = arr.indexOf(value);
        if (index >= 0) {
          arr.splice(index, 1);
        } else {
          arr.push(value);
        }
      }),

    updateDateRange: (type, value) =>
      set((state) => {
        if (!state.filters.dateRange) {
          state.filters.dateRange = { from: null, to: null };
        }
        state.filters.dateRange[type] = value;
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.filters.search = query;
      }),
  }))
);
