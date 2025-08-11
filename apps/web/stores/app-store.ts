import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type AppState = {
  selectedGuildId: string | null;
  sidebarOpen: boolean;
  setSelectedGuildId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

export const useAppStore = create<AppState>()(
  immer((set) => ({
    selectedGuildId: null,
    sidebarOpen: true,

    setSelectedGuildId: (id) =>
      set((state) => {
        state.selectedGuildId = id;
      }),

    setSidebarOpen: (open) =>
      set((state) => {
        state.sidebarOpen = open;
      }),

    toggleSidebar: () =>
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),
  }))
);
