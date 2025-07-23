import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { TeamRole, TeamRoleMember } from "./types";

export interface GuildSettings {
  guildId: string;
  name: string | null;
  settings: {
    // General settings
    maxTicketsPerUser: number;
    language: string;
    allowUsersToClose: boolean;
    ticketCloseConfirmation: boolean;
    enableUserFeedback: boolean;
    anonymousDashboard: boolean;
    showClaimButton: boolean;

    // Auto-close settings
    autoCloseEnabled: boolean;
    autoCloseHours: number;

    // Open Commands settings
    openCommandsEnabled: boolean;
    channelCategory: string;
    namedScheme: string;
    welcomeMessage: string;

    // Context Menu settings
    requiredPermissionLevel: string;
    addMessageSenderToTicket: boolean;
    useSettingsFromPanel: string;

    // Channel IDs
    defaultCategoryId: string | null;
    supportCategoryId: string | null;
    transcriptChannelId: string | null;
  };
  teamRoles?: TeamRole[];
}

async function fetchGuildSettings(guildId: string): Promise<GuildSettings> {
  return apiClient.get<GuildSettings>(`/settings/${guildId}`);
}

async function updateGuildSettings(
  guildId: string,
  settings: Partial<GuildSettings["settings"]>
): Promise<GuildSettings> {
  return apiClient.request<GuildSettings>(`/settings/${guildId}`, {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
}

async function fetchTeamRoles(guildId: string): Promise<{ roles: TeamRole[] }> {
  return apiClient.get<{ roles: TeamRole[] }>(`/settings/${guildId}/team-roles`);
}

async function addRoleMember(
  guildId: string,
  roleId: number,
  discordId: string
): Promise<TeamRoleMember> {
  return apiClient.post<TeamRoleMember>(
    `/settings/${String(guildId)}/roles/${String(roleId)}/members`,
    {
      discordId,
    }
  );
}

async function removeRoleMember(
  guildId: string,
  roleId: number,
  discordId: string
): Promise<{ success: boolean }> {
  return apiClient.request<{ success: boolean }>(
    `/settings/${String(guildId)}/roles/${String(roleId)}/members/${String(discordId)}`,
    {
      method: "DELETE",
    }
  );
}

async function updateRole(
  guildId: string,
  roleId: number,
  data: { name?: string; color?: string; permissions?: string }
): Promise<TeamRole> {
  return apiClient.request<TeamRole>(`/settings/${String(guildId)}/roles/${String(roleId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export const settingsQueries = {
  guild: (guildId: string | null) => ({
    queryKey: ["guild-settings", guildId],
    queryFn: () => {
      if (!guildId) throw new Error("Guild ID is required");
      return fetchGuildSettings(guildId);
    },
    enabled: !!guildId,
    staleTime: 30000,
  }),

  teamRoles: (guildId: string | null) => ({
    queryKey: ["team-roles", guildId],
    queryFn: () => {
      if (!guildId) throw new Error("Guild ID is required");
      return fetchTeamRoles(guildId);
    },
    enabled: !!guildId,
    staleTime: 60000,
  }),
};

export const settingsMutations = {
  updateGuildSettings: {
    mutationFn: ({
      guildId,
      settings,
    }: {
      guildId: string;
      settings: Partial<GuildSettings["settings"]>;
    }) => updateGuildSettings(guildId, settings),
  },

  addRoleMember: {
    mutationFn: ({
      guildId,
      roleId,
      discordId,
    }: {
      guildId: string;
      roleId: number;
      discordId: string;
    }) => addRoleMember(guildId, roleId, discordId),
  },

  removeRoleMember: {
    mutationFn: ({
      guildId,
      roleId,
      discordId,
    }: {
      guildId: string;
      roleId: number;
      discordId: string;
    }) => removeRoleMember(guildId, roleId, discordId),
  },

  updateRole: {
    mutationFn: ({
      guildId,
      roleId,
      data,
    }: {
      guildId: string;
      roleId: number;
      data: { name?: string; color?: string; permissions?: string };
    }) => updateRole(guildId, roleId, data),
  },
};

// Export hooks
export function useGuildSettings(guildId: string | null): any {
  return useQuery(settingsQueries.guild(guildId));
}

export interface UpdateSettingsRequest {
  settings: Partial<GuildSettings["settings"]>;
}

export function useUpdateGuildSettings(): UseMutationResult<
  GuildSettings,
  Error,
  { guildId: string; settings: Partial<GuildSettings["settings"]> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    ...settingsMutations.updateGuildSettings,
    onSuccess: (
      data: GuildSettings,
      variables: { guildId: string; settings: Partial<GuildSettings["settings"]> }
    ) => {
      queryClient.setQueryData(["guild-settings", variables.guildId], data);
    },
  });
}

export function useTeamRoles(guildId: string | null): any {
  return useQuery(settingsQueries.teamRoles(guildId));
}

export function useAddRoleMember(): any {
  const queryClient = useQueryClient();

  return useMutation({
    ...settingsMutations.addRoleMember,
    onSuccess: (_: unknown, variables: any) => {
      void queryClient.invalidateQueries({ queryKey: ["team-roles", variables.guildId] });
    },
  });
}

export function useRemoveRoleMember(): any {
  const queryClient = useQueryClient();

  return useMutation({
    ...settingsMutations.removeRoleMember,
    onSuccess: (_: unknown, variables: any) => {
      void queryClient.invalidateQueries({ queryKey: ["team-roles", variables.guildId] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    ...settingsMutations.updateRole,
    onSuccess: (
      _: unknown,
      variables: {
        guildId: string;
        roleId: number;
        data: { name?: string; color?: string; permissions?: string };
      }
    ) => {
      void queryClient.invalidateQueries({ queryKey: ["team-roles", variables.guildId] });
    },
  });
}
