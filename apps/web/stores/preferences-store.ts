import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCompactMode: (compact: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      compactMode: false,
      setTheme: (theme) => set({ theme }),
      setCompactMode: (compact) => set({ compactMode: compact }),
    }),
    {
      name: 'user-preferences',
    }
  )
);