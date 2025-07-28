import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";

interface Guild {
  id: string;
  name: string;
  icon?: string | null;
  owner: boolean;
  permissions: string;
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
      if (!res.ok) throw new Error("Failed to fetch guilds");
      const data = await res.json();

      // Handle the response format
      if (data.connected && !data.error) {
        setGuilds(data.guilds);
      } else {
        setGuilds([]);
      }
    } catch (err) {
      console.error("Error fetching guilds:", err);
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
    isLoading: isSessionLoading || (session?.user && !hasCheckedGuilds) || isGuildsLoading,
    refetchGuilds: fetchGuilds,
  };
}