import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// User profile queries
export const userQueries = {
  // Get current user profile
  profile: () => ({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      const res = await api.auth.me.$get();
      if (!res.ok) throw new Error("Failed to fetch user profile");
      const data = await res.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  }),

  // Get user by Discord ID
  byDiscordId: (discordId: string | null) => ({
    queryKey: ["user", "discord", discordId],
    queryFn: async () => {
      if (!discordId) return null;
      // This endpoint doesn't exist in the API, return null for now
      // TODO: Add this endpoint to the API if needed
      return null;
    },
    enabled: !!discordId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),
};

export function useUserProfile() {
  return useQuery(userQueries.profile());
}

export function useUserByDiscordId(discordId: string | null) {
  return useQuery(userQueries.byDiscordId(discordId));
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

async function fetchTeams(guildId: string): Promise<Team[]> {
  // TODO: Add teams endpoint to the API
  return [];
}

export const teamsQueries = {
  list: (guildId: string | null) => ({
    queryKey: ["teams", guildId],
    queryFn: () => {
      if (!guildId) throw new Error("Guild ID is required");
      return fetchTeams(guildId);
    },
    enabled: !!guildId,
    staleTime: 60000,
  }),
};

async function fetchDiscordChannels(
  guildId: string,
  types?: number[],
  includeNone: boolean = true
) {
  const res = await api.discord.guild[":id"].channels.$get({
    param: { id: guildId },
    query: { includeNone: includeNone.toString() },
  });
  if (!res.ok) throw new Error("Failed to fetch Discord channels");
  return res.json();
}

async function fetchDiscordRoles(guildId: string) {
  const res = await api.discord.guild[":id"].roles.$get({
    param: { id: guildId },
  });
  if (!res.ok) throw new Error("Failed to fetch Discord roles");
  return res.json();
}

export const discordQueries = {
  channels: (guildId: string | null, types?: number[], includeNone: boolean = true) => ({
    queryKey: ["discord-channels", guildId, types, includeNone],
    queryFn: () => {
      if (!guildId) throw new Error("Guild ID is required");
      return fetchDiscordChannels(guildId, types, includeNone);
    },
    enabled: !!guildId,
    staleTime: 300000,
  }),

  roles: (guildId: string | null) => ({
    queryKey: ["discord-roles", guildId],
    queryFn: () => {
      if (!guildId) throw new Error("Guild ID is required");
      return fetchDiscordRoles(guildId);
    },
    enabled: !!guildId,
    staleTime: 300000,
  }),
};

// Export hooks
export function useDiscordChannels(
  guildId: string | null,
  types?: number[],
  includeNone: boolean = true
) {
  return useQuery(discordQueries.channels(guildId, types, includeNone));
}

export function useDiscordRoles(guildId: string | null) {
  return useQuery(discordQueries.roles(guildId));
}
