import { create } from "zustand";
import { devtools } from "zustand/middleware";

type PanelViewState = "list" | "create" | "edit" | "preview";

interface PanelsUIState {
  // State
  currentView: PanelViewState;
  selectedPanelId: string | null;
  isDeleteModalOpen: boolean;
  deletingPanelId: string | null;
  searchQuery: string;
  sortBy: "name" | "created" | "updated";
  sortDirection: "asc" | "desc";

  // Actions
  setPanelView: (view: PanelViewState) => void;
  selectPanel: (id: string | null) => void;
  openDeleteModal: (panelId: string) => void;
  closeDeleteModal: () => void;
  setPanelSearch: (query: string) => void;
  setPanelSort: (sortBy: "name" | "created" | "updated", direction?: "asc" | "desc") => void;
  resetPanelState: () => void;
}

// Default state
const defaultPanelState = {
  currentView: "list" as PanelViewState,
  selectedPanelId: null,
  isDeleteModalOpen: false,
  deletingPanelId: null,
  searchQuery: "",
  sortBy: "created" as const,
  sortDirection: "desc" as const,
};

// Store implementation
export const usePanelsUIStore = create<PanelsUIState>()(
  devtools(
    (set) => ({
      // Initial state
      ...defaultPanelState,

      // Actions
      setPanelView: (view) => set({ currentView: view }),
      selectPanel: (id) => set({ selectedPanelId: id }),
      openDeleteModal: (panelId) =>
        set({
          isDeleteModalOpen: true,
          deletingPanelId: panelId,
        }),
      closeDeleteModal: () =>
        set({
          isDeleteModalOpen: false,
          deletingPanelId: null,
        }),
      setPanelSearch: (query) => set({ searchQuery: query }),
      setPanelSort: (sortBy, direction) =>
        set((state) => ({
          sortBy,
          sortDirection: direction || state.sortDirection,
        })),
      resetPanelState: () => set(defaultPanelState),
    }),
    {
      name: "panels-ui-store",
    }
  )
);

// Atomic selectors for performance
export const usePanelView = () => usePanelsUIStore((state) => state.currentView);
export const useSelectedPanel = () => usePanelsUIStore((state) => state.selectedPanelId);
export const usePanelSearch = () => usePanelsUIStore((state) => state.searchQuery);
export const useDeletePanelModal = () => ({
  isOpen: usePanelsUIStore((state) => state.isDeleteModalOpen),
  panelId: usePanelsUIStore((state) => state.deletingPanelId),
});

// Action selectors
export const usePanelActions = () => {
  const setPanelView = usePanelsUIStore((state) => state.setPanelView);
  const selectPanel = usePanelsUIStore((state) => state.selectPanel);
  const setPanelSearch = usePanelsUIStore((state) => state.setPanelSearch);
  const setPanelSort = usePanelsUIStore((state) => state.setPanelSort);
  const openDeleteModal = usePanelsUIStore((state) => state.openDeleteModal);
  const closeDeleteModal = usePanelsUIStore((state) => state.closeDeleteModal);
  const resetPanelState = usePanelsUIStore((state) => state.resetPanelState);

  return {
    setView: setPanelView,
    selectPanel,
    setSearch: setPanelSearch,
    setSort: setPanelSort,
    openDeleteModal,
    closeDeleteModal,
    reset: resetPanelState,
  };
};

// Export types
export type { PanelViewState };
