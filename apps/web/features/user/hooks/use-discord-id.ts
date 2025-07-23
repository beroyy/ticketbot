import { useSession } from "@ticketsbot/core/auth/client";

/**
 * Custom hook to get the current user's Discord ID
 * Returns null if not available
 */
export function useDiscordId(): string | null {
  const { data: session } = useSession();
  const user = session?.user as { discordUserId?: string | null } | undefined;
  return user?.discordUserId ?? null;
}

/**
 * Custom hook to get all user data from the session
 */
export function useUserData() {
  const { data: session } = useSession();
  const user = session?.user as { discordUserId?: string | null } | undefined;

  return {
    discordId: user?.discordUserId ?? null,
    betterAuthId: session?.user?.id ?? null,
    username: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    avatarUrl: session?.user?.image ?? null,
  };
}
