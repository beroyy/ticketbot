import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

interface Guild {
  id: string;
  name: string;
  icon?: string | null;
  owner: boolean;
  permissions: string;
  botInstalled?: boolean;
  botConfigured?: boolean;
}

interface GuildWithStatus extends Guild {
  iconUrl?: string | null;
  connected: boolean;
  setupRequired?: boolean;
}

const guildQueries = {
  list: (refresh = false) => ({
    queryKey: ["guilds", { refresh }],
    queryFn: async () => {
      const res = await api.discord.guilds.$get({
        query: refresh ? { refresh: "true" } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch guilds");
      const data = await res.json();
      
      if (!data.connected || data.error) {
        throw new Error(data.error || "Discord account not connected");
      }
      
      return data.guilds;
    },
    staleTime: refresh ? 0 : 5 * 60 * 1000, // No cache if refreshing, 5 minutes otherwise
  }),
};

interface UseGuildDataOptions {
  refresh?: boolean;
  enablePolling?: boolean;
}

export function useGuildData(options?: UseGuildDataOptions) {
  const { refresh = false, enablePolling = false } = options || {};
  const { data: session } = authClient.useSession();

  const { data: guilds = [], isLoading, error, refetch } = useQuery({
    ...guildQueries.list(refresh),
    enabled: !!session?.user,
    // Poll every 2 seconds if polling is enabled and either:
    // 1. No guilds have bot installed (invite state)
    // 2. Any guild has setup required
    refetchInterval: (query) => {
      if (!enablePolling) return false;
      
      const guilds = query.state.data || [];
      
      // Check if NO guilds have bot installed (invite state)
      const noBotInstalled = guilds.length === 0 || 
        guilds.every((guild: Guild) => !guild.botInstalled);
      
      // Check if any guild has setupRequired
      const hasSetupRequired = guilds.some((guild: Guild) => 
        guild.botInstalled && !guild.botConfigured
      );
      
      // Poll if either condition is true
      return (noBotInstalled || hasSetupRequired) ? 2000 : false;
    },
  });

  // Transform guilds to include icon URLs and status
  const transformedGuilds: GuildWithStatus[] = guilds.map((guild: Guild) => ({
    ...guild,
    iconUrl: getGuildIconUrl(guild),
    connected: guild.botInstalled ?? true, // Use botInstalled field, default to true for backward compatibility
    setupRequired: !guild.botInstalled || (guild.botInstalled && !guild.botConfigured), // Setup required if bot is not installed OR not configured
  }));

  // Prefetch guild data on hover
  const prefetchGuild = (_guildId: string) => {
    // In the future, we could prefetch guild-specific data here
  };

  return {
    guilds: transformedGuilds,
    isLoading,
    error,
    refetch,
    prefetchGuild,
  };
}

function getGuildIconUrl(guild: Guild): string | null {
  if (!guild.icon) return null;
  
  // If it's already a full URL, just add the size parameter
  if (guild.icon.startsWith("https://")) {
    return guild.icon.replace(".png", ".png?size=64");
  }
  
  // Otherwise construct the URL from the hash
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`;
}