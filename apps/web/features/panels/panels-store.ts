import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type PanelsState = {
  selectedPanelId: number | null;
  isCreating: boolean;
  selectPanel: (id: number | null) => void;
  setCreating: (creating: boolean) => void;
};

export const usePanelsStore = create<PanelsState>()(
  immer((set) => ({
    selectedPanelId: null,
    isCreating: false,
    selectPanel: (id) =>
      set((state) => {
        state.selectedPanelId = id;
      }),
    setCreating: (creating) =>
      set((state) => {
        state.isCreating = creating;
      }),
  }))
);
