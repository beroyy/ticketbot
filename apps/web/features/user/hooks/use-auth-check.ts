import { authClient } from "@/lib/auth-client";

/**
 * Simple authentication check hook that only handles session state.
 * Guild data should be fetched using useGuildData hook instead.
 */
export function useAuthCheck() {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

  return {
    isAuthenticated: !!session?.user,
    isLoading: isSessionLoading,
    session,
  };
}