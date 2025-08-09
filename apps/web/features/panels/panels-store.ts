import { create } from 'zustand';

interface PanelsState {
  selectedPanelId: number | null;
  isCreating: boolean;
  selectPanel: (id: number | null) => void;
  setCreating: (creating: boolean) => void;
}

export const usePanelsStore = create<PanelsState>()((set) => ({
  selectedPanelId: null,
  isCreating: false,
  selectPanel: (id) => set({ selectedPanelId: id }),
  setCreating: (creating) => set({ isCreating: creating }),
}));