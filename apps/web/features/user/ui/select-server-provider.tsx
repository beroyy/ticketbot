import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { SelectServerModal } from "./select-server-modal";
import { useUserPreference } from "@/hooks/use-user-preference";

interface SelectServerContextType {
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string) => void;
}

const SelectServerContext = createContext<SelectServerContextType | undefined>(undefined);

export function useSelectServer() {
  const context = useContext(SelectServerContext);
  if (context === undefined) {
    throw new Error("useSelectServer must be used within a SelectServerProvider");
  }
  return context;
}

interface SelectServerProviderProps {
  children: ReactNode;
}

export function SelectServerProvider({ children }: SelectServerProviderProps) {
  const { data: session, isPending } = authClient.useSession();
  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const [showSelectServerModal, setShowSelectServerModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Use Redis-backed preference for selected guild
  const {
    value: storedGuildId,
    setValue: saveGuildId,
    isLoading: isLoadingPreference,
  } = useUserPreference<string>("selectedGuildId");

  // Combined initialization effect to prevent multiple renders
  useEffect(() => {
    // Skip if already initialized or data is still loading
    if (hasInitialized || isPending || isLoadingPreference) return;

    // Set guild from stored preference
    if (storedGuildId) {
      setSelectedGuildIdState(storedGuildId);
    }

    // Note: We no longer auto-show the modal here since the AuthGate
    // handles redirecting to /setup if no guilds exist

    setHasInitialized(true);
  }, [session, isPending, hasInitialized, storedGuildId, isLoadingPreference]);

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    setShowSelectServerModal(false);

    // Persist the guild selection to Redis
    saveGuildId(guildId);
  };

  const setSelectedGuildId = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    saveGuildId(guildId);
  };

  return (
    <SelectServerContext.Provider
      value={{
        selectedGuildId,
        setSelectedGuildId,
      }}
    >
      {children}
      <SelectServerModal isOpen={showSelectServerModal} onGuildSelect={handleGuildSelect} />
    </SelectServerContext.Provider>
  );
}
