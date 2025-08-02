import { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import { useAuthCheck } from "@/features/user/hooks/use-auth-check";
import { useGuildData } from "@/features/user/hooks/use-guild-data";
import { useUserPreference } from "@/hooks/use-user-preference";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useInitialSetupComplete, useSetupState } from "@/shared/stores/helpers";

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

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { data: _session, isPending: isSessionLoading } = authClient.useSession();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthCheck();
  const { guilds, isLoading: isGuildsLoading, refetch: refetchGuilds } = useGuildData();
  const initialSetupComplete = useInitialSetupComplete();
  const setupState = useSetupState();

  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [preferenceTimedOut, setPreferenceTimedOut] = useState(false);

  const {
    value: storedGuildId,
    setValue: saveGuildId,
    isLoading: isLoadingPreference,
  } = useUserPreference<string>("selectedGuildId");

  const hasGuilds = guilds.length > 0;
  const hasGuildsWithBot = guilds.some((g) => g.connected === true);

  useEffect(() => {
    if (hasInitialized || isSessionLoading) return;

    if (storedGuildId) {
      setSelectedGuildIdState(storedGuildId);
    }

    setHasInitialized(true);
  }, [hasInitialized, isSessionLoading, storedGuildId]);

  useEffect(() => {
    if (!isLoadingPreference) {
      setPreferenceTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn("Preference loading timed out after 5 seconds");
      setPreferenceTimedOut(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoadingPreference]);

  const targetRoute = useMemo(() => {
    const isLoadingAny =
      isAuthLoading ||
      isSessionLoading ||
      isGuildsLoading ||
      (isLoadingPreference && !preferenceTimedOut) ||
      !hasInitialized;
    if (isLoadingAny) return null;

    if (publicRoutes.includes(router.pathname)) return null;
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
    isLoadingPreference,
    preferenceTimedOut,
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
    setSelectedGuildIdState(guildId);
    saveGuildId(guildId);
  };

  const isLoadingAny =
    isAuthLoading ||
    isSessionLoading ||
    isGuildsLoading ||
    (isLoadingPreference && !preferenceTimedOut) ||
    !hasInitialized;

  useEffect(() => {
    if (isLoadingAny && process.env.NODE_ENV !== "production") {
      console.log("AuthProvider loading states:", {
        isAuthLoading,
        isSessionLoading,
        isGuildsLoading,
        isLoadingPreference,
        preferenceTimedOut,
        hasInitialized,
        pathname: router.pathname,
      });
    }
  }, [
    isLoadingAny,
    isAuthLoading,
    isSessionLoading,
    isGuildsLoading,
    isLoadingPreference,
    preferenceTimedOut,
    hasInitialized,
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
  const hasFullAccess = isPublicRoute || (isAuthenticated && hasGuilds && selectedGuildId);

  if (!hasFullAccess && !isPublicRoute) {
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
        selectedGuildId,
        setSelectedGuildId,
        isLoadingGuildSelection: (isLoadingPreference && !preferenceTimedOut) || !hasInitialized,
        refetchGuilds: async () => {
          await refetchGuilds();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
