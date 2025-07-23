import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// User profile types
export interface UserProfile {
  id: string;
  discordUserId: string;
  name: string;
  email: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

// User profile queries
export const userQueries = {
  // Get current user profile
  profile: () => ({
    queryKey: ["user", "profile"],
    queryFn: async (): Promise<UserProfile> => {
      const response = await apiClient.get<{ user: UserProfile }>("/api/auth/me");
      return response.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  }),

  // Get user by Discord ID
  byDiscordId: (discordId: string | null) => ({
    queryKey: ["user", "discord", discordId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!discordId) return null;
      return apiClient.get<UserProfile>(`/users/discord/${discordId}`);
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
  const params = new URLSearchParams({ guildId });
  return apiClient.get<Team[]>(`/teams?${params}`);
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

export interface DiscordChannel {
  id: string | null;
  name: string;
  type: number | null;
  position: number;
  parentId: string | null;
  typeDescription: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
}

async function fetchDiscordChannels(
  guildId: string,
  types?: number[],
  includeNone: boolean = true
): Promise<DiscordChannel[]> {
  const params = new URLSearchParams();
  if (types && types.length > 0) {
    params.append("types", types.map((t) => String(t)).join(","));
  }
  if (!includeNone) {
    params.append("includeNone", "false");
  }
  const queryString = params.toString();
  const url = `/discord/guild/${guildId}/channels${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<DiscordChannel[]>(url);
}

async function fetchDiscordRoles(guildId: string): Promise<DiscordRole[]> {
  return apiClient.get<DiscordRole[]>(`/discord/guild/${guildId}/roles`);
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
