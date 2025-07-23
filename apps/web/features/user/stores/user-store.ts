import { create } from "zustand";
import { devtools } from "zustand/middleware";

// This store should only contain client-side UI state, not server-derived data
// Server-derived user data should come from the auth session or user queries

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UserUIState {
  // Add any client-side UI state related to user features here
  // For example: preferences that don't need to be persisted to the server
  // Currently empty as all user data comes from the server
}

export const useUserUIStore = create<UserUIState>()(
  devtools(
    () => ({
      // Empty for now - add client-side UI state as needed
    }),
    {
      name: "user-ui-store",
    }
  )
);
