import { create } from 'zustand';

interface SettingsState {
  activeTab: string;
  hasUnsavedChanges: boolean;
  setActiveTab: (tab: string) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  activeTab: 'general',
  hasUnsavedChanges: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
}));