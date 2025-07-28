import { api } from "@/lib/api";
import type { PermissionsResponse, UserPermissions } from "./types";

async function fetchUserPermissions(guildId: string): Promise<UserPermissions> {
  const res = await api.settings[":guildId"].permissions.$get({
    param: { guildId },
  });
  if (!res.ok) throw new Error("Failed to fetch permissions");
  const data = await res.json() as PermissionsResponse;

  // Convert permission strings back to bigint
  return {
    guildId,
    permissions: BigInt(data.permissions),
    roles: data.roles.map((role) => ({
      ...role,
      permissions: BigInt(role.permissions),
    })),
  };
}

export const permissionQueries = {
  get: (guildId: string | null | undefined) => ({
    queryKey: ["permissions", "user", guildId],
    queryFn: () => fetchUserPermissions(guildId!),
    enabled: !!guildId,
    staleTime: 30 * 1000, // 30 seconds
  }),
};
