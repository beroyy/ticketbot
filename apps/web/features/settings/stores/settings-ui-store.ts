import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface SettingsUIState {
  // State
  teamSearchQuery: string;
  selectedMemberId: string | null;

  // Actions
  setTeamSearch: (query: string) => void;
  selectMember: (id: string | null) => void;
}

// Store implementation
export const useSettingsUIStore = create<SettingsUIState>()(
  devtools(
    (set) => ({
      // Initial state
      teamSearchQuery: "",
      selectedMemberId: null,

      // Actions
      setTeamSearch: (query) => set({ teamSearchQuery: query }),
      selectMember: (id) => set({ selectedMemberId: id }),
    }),
    {
      name: "settings-ui-store",
    }
  )
);

// Atomic selectors for performance
export const useTeamSearch = () => useSettingsUIStore((state) => state.teamSearchQuery);
export const useSelectedMember = () => useSettingsUIStore((state) => state.selectedMemberId);

// Action selectors
export const useSettingsActions = () => {
  const setTeamSearch = useSettingsUIStore((state) => state.setTeamSearch);
  const selectMember = useSettingsUIStore((state) => state.selectMember);

  return {
    setTeamSearch,
    selectMember,
  };
};