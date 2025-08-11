import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type PreferencesState = {
  theme: "light" | "dark" | "system";
  compactMode: boolean;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setCompactMode: (compact: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    immer((set) => ({
      theme: "system",
      compactMode: false,
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),
      setCompactMode: (compact) =>
        set((state) => {
          state.compactMode = compact;
        }),
    })),
    {
      name: "user-preferences",
    }
  )
);
