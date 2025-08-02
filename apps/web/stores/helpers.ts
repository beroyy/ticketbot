import { create } from "zustand";

export const useInitialSetupComplete = create<boolean>()(() => false);

export type SetupState = "selecting" | "configuring" | "complete" | "ready";
export const useSetupState = create<SetupState>()(() => "selecting");
