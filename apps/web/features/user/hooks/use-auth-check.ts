import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface Guild {
  id: string;
  name: string;
  icon?: string | null;
  owner: boolean;
  permissions: string;
  botInstalled?: boolean;
  botConfigured?: boolean;
}

export function useAuthCheck() {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isGuildsLoading, setIsGuildsLoading] = useState(false);
  const [hasCheckedGuilds, setHasCheckedGuilds] = useState(false);

  const fetchGuilds = async () => {
    if (!session?.user) return;

    setIsGuildsLoading(true);
    try {
      const res = await api.discord.guilds.$get();
      
      // Log response details for debugging
      logger.debug("Discord guilds API response:", {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
      });

      if (!res.ok) {
        // Try to parse error response
        let errorMessage = `Failed to fetch guilds (${res.status})`;
        try {
          const errorData = await res.json();
          logger.error("Guild fetch error response:", errorData);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, try text
          try {
            const errorText = await res.text();
            logger.error("Guild fetch error text:", errorText);
          } catch {
            // Ignore parsing errors
          }
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      logger.debug("Discord guilds data:", data);

      // Handle the response format
      if (data.connected && !data.error) {
        setGuilds(data.guilds);
      } else {
        // Log specific error conditions
        if (!data.connected) {
          logger.warn("Discord account not connected");
        }
        if (data.error) {
          logger.error("Discord API error:", data.error, "Code:", data.code);
          
          // Show user-friendly error messages
          if (data.code === "DISCORD_NOT_CONNECTED") {
            logger.info("Discord account needs to be connected. Please link your Discord account.");
          } else if (data.code === "DISCORD_TOKEN_EXPIRED" || data.code === "DISCORD_TOKEN_INVALID") {
            logger.info("Discord authentication expired. Please re-authenticate with Discord.");
          }
        }
        setGuilds([]);
      }
    } catch (err) {
      logger.error("Error fetching guilds:", err);
      
      // Log additional error details
      if (err instanceof Error) {
        logger.error("Error details:", {
          message: err.message,
          stack: err.stack,
        });
      }
      
      setGuilds([]);
    } finally {
      setIsGuildsLoading(false);
      setHasCheckedGuilds(true);
    }
  };

  // Fetch guilds when session is available
  useEffect(() => {
    if (session?.user && !hasCheckedGuilds) {
      void fetchGuilds();
    }
  }, [session?.user, hasCheckedGuilds]);

  return {
    isAuthenticated: !!session?.user,
    hasGuilds: guilds.length > 0,
    hasGuildsWithBot: guilds.some(g => g.botInstalled === true),
    isLoading: isSessionLoading || (session?.user && !hasCheckedGuilds) || isGuildsLoading,
    refetchGuilds: () => fetchGuilds(),
    guilds, // Expose guilds for debugging
  };
}