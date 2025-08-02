import { createContext, useContext, useMemo, useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import { useGuildData } from "@/features/user/hooks/use-guild-data";
import { useGlobalStore } from "@/stores/global";
import { useHydratedStore } from "@/hooks/use-hydrated-store";
import { getAuthRedirect, isRouteAllowed } from "@/lib/routes";
import { AuthLoading } from "@/components/auth-loading";

type AuthState = "loading" | "unauthenticated" | "no-guild" | "authenticated";

type AuthContextValue = {
  isAuthenticated: boolean;
  hasGuildSelected: boolean;
  isLoading: boolean;
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string | null) => void;
  authState: AuthState;
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

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { guilds, isLoading: guildsLoading, refetch: refetchGuilds } = useGuildData();

  const selectedGuildId = useHydratedStore(useGlobalStore, (state) => state.selectedGuildId);
  const setSelectedGuildIdStore = useGlobalStore((state) => state.setSelectedGuildId);

  const authState: AuthState = useMemo(() => {
    if (sessionLoading) return "loading";
    if (!session?.user) return "unauthenticated";
    if (guildsLoading) return "loading";
    if (selectedGuildId === undefined) return "loading";

    const hasValidGuild =
      selectedGuildId && guilds.some((g) => g.id === selectedGuildId && g.connected);
    if (!hasValidGuild) return "no-guild";

    return "authenticated";
  }, [sessionLoading, session, guildsLoading, selectedGuildId, guilds]);

  useEffect(() => {
    if (authState === "loading") return;

    const pathname = router.pathname;
    // const routeType = getRouteType(pathname);

    if (pathname === "/") {
      return;
    }

    const allowed = isRouteAllowed(pathname, authState);

    if (!allowed) {
      const redirect = getAuthRedirect(authState);
      if (redirect && pathname !== redirect) {
        console.log(
          `[Auth] Redirecting from ${pathname} to ${redirect} (auth state: ${authState})`
        );
        router.replace(redirect);
      }
    }
  }, [authState, router.pathname, router]);

  const setSelectedGuildId = (guildId: string | null) => {
    if (guildId) {
      if (guildsLoading || guilds.length === 0) {
        setSelectedGuildIdStore(guildId);
        return;
      }

      const guild = guilds.find((g) => g.id === guildId);
      if (guild && guild.connected) {
        setSelectedGuildIdStore(guildId);
      } else {
        console.warn(`[Auth] Attempted to select invalid guild: ${guildId}`);
        setSelectedGuildIdStore(null);
      }
    } else {
      setSelectedGuildIdStore(null);
    }
  };

  const contextValue: AuthContextValue = {
    isAuthenticated: !!session?.user,
    hasGuildSelected:
      !!selectedGuildId && guilds.some((g) => g.id === selectedGuildId && g.connected),
    isLoading: authState === "loading",
    selectedGuildId: selectedGuildId ?? null,
    setSelectedGuildId,
    authState,
    refetchGuilds: async () => {
      await refetchGuilds();
    },
  };

  if (authState === "loading" && router.pathname !== "/login") {
    return <AuthLoading />;
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
