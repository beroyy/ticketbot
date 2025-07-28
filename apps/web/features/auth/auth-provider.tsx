import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import { useAuthCheck } from "@/features/user/hooks/use-auth-check";
import { useUserPreference } from "@/hooks/use-user-preference";
import { SelectServerModal } from "@/features/user/ui/select-server-modal";
import { LoadingSpinner } from "@/components/loading-spinner";

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  hasGuilds: boolean;
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

const publicRoutes = ["/login", "/setup", "/guilds"];

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const { isAuthenticated, hasGuilds, isLoading: isAuthLoading, refetchGuilds } = useAuthCheck();
  
  // Guild selection state
  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const [showSelectServerModal, setShowSelectServerModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Use Redis-backed preference for selected guild
  const {
    value: storedGuildId,
    setValue: saveGuildId,
    isLoading: isLoadingPreference,
  } = useUserPreference<string>("selectedGuildId");

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

  // Navigation effect
  useEffect(() => {
    // Wait for all loading to complete
    const isLoadingAny = isAuthLoading || isSessionLoading || isLoadingPreference || !hasInitialized;
    if (isLoadingAny) return;

    const currentPath = router.pathname;

    // Allow access to public routes
    if (publicRoutes.includes(currentPath)) {
      return;
    }

    // Redirect based on auth state
    if (!isAuthenticated) {
      router.push("/login");
    } else if (!hasGuilds) {
      router.push("/setup");
    } else if (!selectedGuildId) {
      // User has guilds but hasn't selected one
      router.push("/guilds");
    }
  }, [isAuthenticated, hasGuilds, selectedGuildId, isAuthLoading, isSessionLoading, isLoadingPreference, hasInitialized, router]);

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    setShowSelectServerModal(false);
    saveGuildId(guildId);
  };

  const setSelectedGuildId = (guildId: string) => {
    setSelectedGuildIdState(guildId);
    saveGuildId(guildId);
  };

  // Show loading state while checking auth or guild selection
  const isLoadingAny = isAuthLoading || isSessionLoading || isLoadingPreference || !hasInitialized;
  
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
        isLoading: isLoadingAny,
        selectedGuildId,
        setSelectedGuildId,
        isLoadingGuildSelection: isLoadingPreference || !hasInitialized,
        refetchGuilds,
      }}
    >
      {children}
      <SelectServerModal isOpen={showSelectServerModal} onGuildSelect={handleGuildSelect} />
    </AuthContext.Provider>
  );
}