import { create } from 'zustand';

interface TicketFilters {
  status?: string[];
  assignee?: string[];
  type?: string[];
  search?: string;
  dateRange?: {
    from: string | null;
    to: string | null;
  };
}

interface TicketsState {
  filters: TicketFilters;
  selectedTicketId: string | null;
  viewMode: 'list' | 'kanban';
  setFilters: (filters: TicketFilters) => void;
  clearFilters: () => void;
  selectTicket: (id: string | null) => void;
  setViewMode: (mode: 'list' | 'kanban') => void;
}

export const useTicketsStore = create<TicketsState>()((set) => ({
  filters: {},
  selectedTicketId: null,
  viewMode: 'list',
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
  selectTicket: (id) => set({ selectedTicketId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));