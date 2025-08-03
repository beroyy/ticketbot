import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { PermissionUtils } from "@ticketsbot/core/client";
import { useAuth } from "@/features/auth/auth-provider-ssr";
import { permissionQueries } from "../queries";

interface UsePermissionsReturn {
  // Data
  permissions: bigint;
  roles: Array<{ id: number; name: string; permissions: bigint }>;
  guildId?: string;

  // Query states
  isLoading: boolean;
  error: unknown;

  // Helper functions
  hasPermission: (permission: bigint) => boolean;
  hasAnyPermission: (...permissions: bigint[]) => boolean;
  hasAllPermissions: (...permissions: bigint[]) => boolean;
  getPermissionNames: () => string[];

  // Actions
  refetch: () => void;
}

export function usePermissions(guildIdOverride?: string): UsePermissionsReturn {
  const router = useRouter();
  const { selectedGuildId } = useAuth();

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
    guildId: guildId || undefined,

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
