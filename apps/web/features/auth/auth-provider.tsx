import { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import { useAuthCheck } from "@/features/user/hooks/use-auth-check";
import { useGuildData } from "@/features/user/hooks/use-guild-data";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useInitialSetupComplete, useSetupState } from "@/stores/helpers";
import { useGlobalStore } from "@/stores/global";
import { useHydratedStore } from "@/hooks/use-hydrated-store";

type AuthContextType = {
  isAuthenticated: boolean;
  hasGuilds: boolean;
  hasGuildsWithBot: boolean;
  isLoading: boolean;
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string) => void;
  isLoadingGuildSelection: boolean;
  refetchGuilds: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

const publicRoutes = ["/login"];
const authOnlyRoutes = ["/setup"]; // Routes that need auth but not guild selection

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { data: _session, isPending: isSessionLoading } = authClient.useSession();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthCheck();
  const { guilds, isLoading: isGuildsLoading, refetch: refetchGuilds } = useGuildData();
  const initialSetupComplete = useInitialSetupComplete();
  const setupState = useSetupState();

  const [hasInitialized, setHasInitialized] = useState(false);

  const selectedGuildId = useHydratedStore(useGlobalStore, (state) => state.selectedGuildId);
  const setSelectedGuildIdGlobal = useGlobalStore((state) => state.setSelectedGuildId);

  const hasGuilds = guilds.length > 0;
  const hasGuildsWithBot = guilds.some((g) => g.connected === true);

  useEffect(() => {
    if (hasInitialized) return;

    setHasInitialized(true);
  }, [hasInitialized]);

  const targetRoute = useMemo(() => {
    const isLoadingAny = isAuthLoading || isSessionLoading || isGuildsLoading || !hasInitialized;
    if (isLoadingAny) return null;

    if (publicRoutes.includes(router.pathname)) return null;
    if (authOnlyRoutes.includes(router.pathname)) return null;
    if (initialSetupComplete && router.pathname === "/setup") return null;
    if (router.pathname === "/setup" && setupState === "ready") {
      useSetupState.setState("selecting");
      return "/";
    }
    if (!isAuthenticated) return "/login";
    if (!hasGuilds || !hasGuildsWithBot || !selectedGuildId) return "/setup";
    return null;
  }, [
    isAuthLoading,
    isSessionLoading,
    isGuildsLoading,
    hasInitialized,
    isAuthenticated,
    hasGuilds,
    hasGuildsWithBot,
    selectedGuildId,
    router.pathname,
    initialSetupComplete,
    setupState,
  ]);

  useEffect(() => {
    if (targetRoute && router.pathname !== targetRoute) {
      router.replace(targetRoute);
    }
  }, [targetRoute, router.pathname]);

  const setSelectedGuildId = (guildId: string) => {
    setSelectedGuildIdGlobal(guildId);
  };

  const isLoadingAny = isAuthLoading || isSessionLoading || isGuildsLoading || !hasInitialized;

  useEffect(() => {
    if (isLoadingAny && process.env.NODE_ENV !== "production") {
      console.log("AuthProvider loading states:", {
        isAuthLoading,
        isSessionLoading,
        isGuildsLoading,
        hasInitialized,
        selectedGuildId,
        pathname: router.pathname,
      });
    }
  }, [
    isLoadingAny,
    isAuthLoading,
    isSessionLoading,
    isGuildsLoading,
    hasInitialized,
    selectedGuildId,
    router.pathname,
  ]);

  if (isLoadingAny) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const isPublicRoute = publicRoutes.includes(router.pathname);
  const isAuthOnlyRoute = authOnlyRoutes.includes(router.pathname);
  const needsGuild = !isPublicRoute && !isAuthOnlyRoute;

  const hasAccess =
    isPublicRoute ||
    (isAuthenticated && isAuthOnlyRoute) ||
    (isAuthenticated && hasGuilds && selectedGuildId && needsGuild);

  if (!hasAccess) {
    if (process.env.NODE_ENV !== "production") {
      console.log("AuthProvider access denied:", {
        isPublicRoute,
        isAuthenticated,
        hasGuilds,
        selectedGuildId,
        pathname: router.pathname,
      });
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        hasGuilds,
        hasGuildsWithBot,
        isLoading: isLoadingAny,
        selectedGuildId: selectedGuildId ?? null,
        setSelectedGuildId,
        isLoadingGuildSelection: !hasInitialized,
        refetchGuilds: async () => {
          await refetchGuilds();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
