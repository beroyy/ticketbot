import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type SettingsState = {
  activeTab: string;
  hasUnsavedChanges: boolean;
  setActiveTab: (tab: string) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;

  updateSettings: (
    updater: (state: Pick<SettingsState, "activeTab" | "hasUnsavedChanges">) => void
  ) => void;
};

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    activeTab: "general",
    hasUnsavedChanges: false,

    setActiveTab: (tab) =>
      set((state) => {
        state.activeTab = tab;
      }),

    setUnsavedChanges: (hasChanges) =>
      set((state) => {
        state.hasUnsavedChanges = hasChanges;
      }),

    updateSettings: (updater) =>
      set((state) => {
        updater(state);
      }),
  }))
);
