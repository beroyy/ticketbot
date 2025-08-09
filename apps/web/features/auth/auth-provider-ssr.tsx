import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import type { ServerSession, AuthState } from "@/lib/server-auth";
import type { Guild } from "@/lib/api-server";
import { useAppStore } from "@/stores/app-store";

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
  initialGuilds = [],
}: AuthProviderProps) {
  const router = useRouter();

  // Simple: use initial session directly, client session for updates
  const { data: clientSession } = authClient.useSession();
  const session = (clientSession as ServerSession | null) || initialSession;

  // Direct store access
  const selectedGuildId = useAppStore((s) => s.selectedGuildId) ?? initialGuildId;
  const setSelectedGuildIdStore = useAppStore((s) => s.setSelectedGuildId);

  const setSelectedGuildId = (guildId: string | null) => {
    // Simple validation and update
    const isValid = guildId && initialGuilds.some((g) => g.id === guildId && g.connected);
    
    if (isValid) {
      setSelectedGuildIdStore(guildId);
      document.cookie = `ticketsbot-selected-guild=${guildId}; path=/; max-age=604800`;
    } else {
      setSelectedGuildIdStore(null);
      document.cookie = "ticketsbot-selected-guild=; path=/; max-age=0";
    }
  };

  // Simple auth state calculation
  const authState = !session 
    ? "unauthenticated" 
    : !selectedGuildId || !initialGuilds.some((g) => g.id === selectedGuildId && g.connected)
    ? "no-guild"
    : "authenticated";

  const contextValue: AuthContextValue = {
    session,
    isAuthenticated: !!session,
    hasGuildSelected: !!selectedGuildId && initialGuilds.some((g) => g.id === selectedGuildId && g.connected),
    isLoading: false,
    selectedGuildId,
    setSelectedGuildId,
    authState,
    guilds: initialGuilds,
    refetchGuilds: async () => {
      router.replace(router.asPath);
    },
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
