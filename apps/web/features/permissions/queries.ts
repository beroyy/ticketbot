import { api } from "@/lib/api";
import type { PermissionsResponse, UserPermissions } from "./types";

async function fetchUserPermissions(guildId: string): Promise<UserPermissions> {
  const res = await api.permissions[":guildId"].$get({
    param: { guildId },
  });
  if (!res.ok) throw new Error("Failed to fetch permissions");
  const data = await res.json();

  // Convert permission string to bigint
  return {
    guildId,
    permissions: BigInt(data.permissions),
    roles: [], // Roles are no longer returned from this endpoint
  };
}

export const permissionQueries = {
  get: (guildId: string | null | undefined) => ({
    queryKey: ["permissions", "user", guildId],
    queryFn: () => fetchUserPermissions(guildId!),
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),
};
