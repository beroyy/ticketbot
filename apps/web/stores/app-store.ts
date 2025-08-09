import { create } from 'zustand';

interface AppState {
  selectedGuildId: string | null;
  sidebarOpen: boolean;
  setSelectedGuildId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedGuildId: null,
  sidebarOpen: true,
  setSelectedGuildId: (id) => set({ selectedGuildId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));