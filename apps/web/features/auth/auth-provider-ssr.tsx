import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import type { ServerSession, AuthState } from "@/lib/server-auth";
import type { Guild } from "@/lib/api-server";
import { useGlobalStore } from "@/stores/global";
import { useHydratedStore } from "@/hooks/use-hydrated-store";

type AuthContextValue = {
  session: ServerSession | null;
  isAuthenticated: boolean;
  hasGuildSelected: boolean;
  isLoading: boolean;
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string | null) => void;
  authState: AuthState;
  guilds: Guild[];
  refetchGuilds: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  initialSession?: ServerSession | null;
  initialAuthState?: AuthState;
  initialGuildId?: string | null;
  initialGuilds?: Guild[];
}

export function AuthProvider({ 
  children, 
  initialSession = null,
  initialAuthState: _initialAuthState = "unauthenticated",
  initialGuildId = null,
  initialGuilds = []
}: AuthProviderProps) {
  const router = useRouter();
  
  // Use client-side session for updates, but default to server session
  const { data: clientSession } = authClient.useSession();
  const session = (clientSession as ServerSession | null) || initialSession;
  
  // Get selected guild from store (hydrated)
  const storeSelectedGuildId = useHydratedStore(useGlobalStore, (state) => state.selectedGuildId);
  const setSelectedGuildIdStore = useGlobalStore((state) => state.setSelectedGuildId);
  
  // Use store value if available, otherwise use initial
  const selectedGuildId = storeSelectedGuildId ?? initialGuildId;
  
  const setSelectedGuildId = (guildId: string | null) => {
    if (guildId) {
      // Verify guild is valid
      const guild = initialGuilds.find((g) => g.id === guildId && g.connected);
      if (guild) {
        setSelectedGuildIdStore(guildId);
        // Set cookie for server-side persistence
        document.cookie = `ticketsbot-selected-guild=${guildId}; path=/; max-age=604800`;
      } else {
        console.warn(`[Auth] Attempted to select invalid guild: ${guildId}`);
        setSelectedGuildIdStore(null);
        // Clear cookie
        document.cookie = "ticketsbot-selected-guild=; path=/; max-age=0";
      }
    } else {
      setSelectedGuildIdStore(null);
      // Clear cookie
      document.cookie = "ticketsbot-selected-guild=; path=/; max-age=0";
    }
  };
  
  const authState = useMemo(() => {
    if (!session) return "unauthenticated";
    if (!selectedGuildId) return "no-guild";
    
    const hasValidGuild = initialGuilds.some((g) => g.id === selectedGuildId && g.connected);
    if (!hasValidGuild) return "no-guild";
    
    return "authenticated";
  }, [session, selectedGuildId, initialGuilds]);
  
  const contextValue: AuthContextValue = {
    session,
    isAuthenticated: !!session,
    hasGuildSelected: !!selectedGuildId && initialGuilds.some((g) => g.id === selectedGuildId && g.connected),
    isLoading: false, // No loading state needed with SSR
    selectedGuildId,
    setSelectedGuildId,
    authState,
    guilds: initialGuilds,
    refetchGuilds: async () => {
      // Trigger a page refresh to get new data from server
      router.replace(router.asPath);
    },
  };
  
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}