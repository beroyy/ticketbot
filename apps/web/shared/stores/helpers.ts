import { create } from "zustand";

export const useInitialSetupComplete = create<boolean>()(() => false);
