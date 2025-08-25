import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useSession } from "@ticketsbot/auth/client";
import { SelectServerModal } from "./select-server-modal";

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
  const { data: session } = useSession();
  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const [showSelectServerModal, setShowSelectServerModal] = useState(false);

  // Load guild selection from localStorage on mount
  useEffect(() => {
    const storedGuildId = localStorage.getItem("selectedGuildId");
    if (storedGuildId) {
      setSelectedGuildIdState(storedGuildId);
    }
  }, []);

  // Show modal every time user has a session (each new session)
  useEffect(() => {
    if (session?.user) {
      setShowSelectServerModal(true);
    }
  }, [session]);

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    setShowSelectServerModal(false);

    // Persist the guild selection
    localStorage.setItem("selectedGuildId", guildId);
  };

  const setSelectedGuildId = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    localStorage.setItem("selectedGuildId", guildId);
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
