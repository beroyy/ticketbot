import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface DiscordStatus {
  connected: boolean;
  account: {
    accountId: string;
    hasValidToken: boolean;
    expiresAt: string | null;
    needsReauth: boolean;
  } | null;
}

export function useDiscordStatus() {
  return useQuery({
    queryKey: ["user", "discord-status"],
    queryFn: async () => {
      const res = await api.user.$get();
      
      if (!res.ok) {
        logger.error("Failed to fetch user info:", res.status);
        throw new Error("Failed to fetch user info");
      }
      
      const data = await res.json();
      logger.debug("Discord connection status:", data.discord);
      
      return data.discord as DiscordStatus;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}