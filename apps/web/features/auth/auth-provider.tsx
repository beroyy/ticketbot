import { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import { useAuthCheck } from "@/features/user/hooks/use-auth-check";
import { useGuildData } from "@/features/user/hooks/use-guild-data";
import { useUserPreference } from "@/hooks/use-user-preference";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useInitialSetupComplete } from "@/shared/stores/helpers";

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  hasGuilds: boolean;
  hasGuildsWithBot: boolean;
  isLoading: boolean;
  
  // Guild selection
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string) => void;
  isLoadingGuildSelection: boolean;
  
  // Actions
  refetchGuilds: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

const publicRoutes = ["/login"];

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthCheck();
  const { guilds, isLoading: isGuildsLoading, refetch: refetchGuilds } = useGuildData();
  const initialSetupComplete = useInitialSetupComplete();
  
  // Guild selection state
  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Use Redis-backed preference for selected guild
  const {
    value: storedGuildId,
    setValue: saveGuildId,
    isLoading: isLoadingPreference,
  } = useUserPreference<string>("selectedGuildId");

  // Calculate guild states from guild data
  const hasGuilds = guilds.length > 0;
  const hasGuildsWithBot = guilds.some(g => g.connected === true);

  // Combined initialization effect
  useEffect(() => {
    // Skip if already initialized or data is still loading
    if (hasInitialized || isSessionLoading || isLoadingPreference) return;

    // Set guild from stored preference
    if (storedGuildId) {
      setSelectedGuildIdState(storedGuildId);
    }

    setHasInitialized(true);
  }, [session, isSessionLoading, hasInitialized, storedGuildId, isLoadingPreference]);

  // Calculate target route declaratively
  const targetRoute = useMemo(() => {
    // Skip calculation while loading
    const isLoadingAny = isAuthLoading || isSessionLoading || isGuildsLoading || isLoadingPreference || !hasInitialized;
    if (isLoadingAny) return null;

    // Allow public routes
    if (publicRoutes.includes(router.pathname)) return null;

    // Stay on setup page if showing completion dialog
    if (initialSetupComplete && router.pathname === "/setup") return null;

    // Determine required route based on auth state
    if (!isAuthenticated) return '/login';
    if (!hasGuilds || !hasGuildsWithBot) return '/setup';
    if (!selectedGuildId) return '/guilds';
    
    return null; // No redirect needed
  }, [isAuthLoading, isSessionLoading, isGuildsLoading, isLoadingPreference, hasInitialized, isAuthenticated, hasGuilds, hasGuildsWithBot, selectedGuildId, router.pathname, initialSetupComplete]);

  // Simple navigation effect with minimal dependencies
  useEffect(() => {
    if (targetRoute && router.pathname !== targetRoute) {
      router.replace(targetRoute);
    }
  }, [targetRoute, router.pathname]);


  const setSelectedGuildId = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    saveGuildId(guildId);
  };

  // Show loading state while checking auth or guild selection
  const isLoadingAny = isAuthLoading || isSessionLoading || isGuildsLoading || isLoadingPreference || !hasInitialized;
  
  if (isLoadingAny) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Check if we should render children
  const isPublicRoute = publicRoutes.includes(router.pathname);
  const hasFullAccess = isPublicRoute || (isAuthenticated && hasGuilds && selectedGuildId);

  if (!hasFullAccess && !isPublicRoute) {
    // Show loading while redirect is happening
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
        isLoadingGuildSelection: isLoadingPreference || !hasInitialized,
        refetchGuilds: async () => {
        await refetchGuilds();
      },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}