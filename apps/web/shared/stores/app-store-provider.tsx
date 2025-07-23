import { type ReactNode, useEffect } from "react";
import { useAppStore } from "./app-store";

interface AppStoreProviderProps {
  children: ReactNode;
}

/**
 * AppStoreProvider is a simple wrapper that ensures the store is properly initialized.
 * Since we're using a global store pattern (not context-based), this provider
 * mainly handles store initialization and cleanup.
 */
export function AppStoreProvider({ children }: AppStoreProviderProps) {
  // Clear stale notifications on mount
  useEffect(() => {
    const { clearNotifications } = useAppStore.getState();
    clearNotifications();
  }, []);

  // No context provider needed since useAppStore is a global store
  return <>{children}</>;
}
