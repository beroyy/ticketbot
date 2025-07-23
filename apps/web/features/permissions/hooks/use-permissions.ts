import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { PermissionUtils } from "@ticketsbot/core/client";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { permissionQueries } from "../queries";

export function usePermissions(guildIdOverride?: string): any {
  const router = useRouter();
  const { selectedGuildId } = useSelectServer();

  // Determine guild ID from multiple sources
  // During SSG, router.query will be empty, so we safely handle it
  const queryGuildId = router.query ? (router.query["guildId"] as string) : undefined;
  const guildId = guildIdOverride || queryGuildId || selectedGuildId;

  const query = useQuery(permissionQueries.get(guildId));

  const permissions = query.data?.permissions ?? BigInt(0);
  const roles = query.data?.roles ?? [];

  // Helper functions
  const hasPermission = (permission: bigint): boolean => {
    if (!query.data) return false;
    return PermissionUtils.hasPermission(permissions, permission);
  };

  const hasAnyPermission = (...perms: bigint[]): boolean => {
    if (!query.data) return false;
    return PermissionUtils.hasAnyPermission(permissions, ...perms);
  };

  const hasAllPermissions = (...perms: bigint[]): boolean => {
    if (!query.data) return false;
    return PermissionUtils.hasAllPermissions(permissions, ...perms);
  };

  const getPermissionNames = (): string[] => {
    if (!query.data) return [];
    return PermissionUtils.getPermissionNames(permissions);
  };

  return {
    // Data
    permissions,
    roles,
    guildId,

    // Query states
    isLoading: query.isLoading,
    error: query.error,

    // Helper functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionNames,

    // Actions
    refetch: query.refetch,
  };
}

// Re-export permission flags for convenience
export { PermissionFlags } from "@ticketsbot/core/client";
