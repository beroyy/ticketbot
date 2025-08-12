import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { PermissionUtils, getUserRole, getUserPermissionsFromRole, type OrganizationRole } from "@ticketsbot/auth";
import { useAuth } from "@/features/auth";
import { permissionQueries } from "../queries";

interface UsePermissionsReturn {
  // Data
  permissions: bigint;
  role: OrganizationRole | null;
  roles: Array<{ id: number; name: string; permissions: bigint }>;
  guildId?: string;

  // Query states
  isLoading: boolean;
  error: unknown;

  // Helper functions
  hasPermission: (permission: bigint) => boolean;
  hasAnyPermission: (...permissions: bigint[]) => boolean;
  hasAllPermissions: (...permissions: bigint[]) => boolean;
  hasRole: (requiredRoles: OrganizationRole[]) => boolean;
  getPermissionNames: () => string[];

  // Role checks
  isOwner: boolean;
  isAdmin: boolean;
  isSupport: boolean;

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

  // Get role-based permissions if available
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<bigint>(BigInt(0));

  useEffect(() => {
    async function fetchRole() {
      if (!guildId) return;
      
      // Get current user from auth session
      const authResponse = await fetch("/api/auth/me");
      if (!authResponse.ok) return;
      
      const authData = await authResponse.json();
      const discordUserId = authData.user?.discordUserId;
      
      if (discordUserId) {
        const userRole = await getUserRole(guildId, discordUserId);
        setRole(userRole);
        if (userRole) {
          const perms = await getUserPermissionsFromRole(guildId, discordUserId);
          setRolePermissions(perms);
        }
      }
    }
    
    fetchRole();
  }, [guildId]);

  // Use role permissions if available, otherwise fall back to legacy permissions
  const permissions = rolePermissions || query.data?.permissions || BigInt(0);
  const roles = query.data?.roles ?? [];

  // Helper functions
  const hasPermission = (permission: bigint): boolean => {
    if (!query.data && !rolePermissions) return false;
    return PermissionUtils.hasPermission(permissions, permission);
  };

  const hasAnyPermission = (...perms: bigint[]): boolean => {
    if (!query.data && !rolePermissions) return false;
    return PermissionUtils.hasAnyPermission(permissions, ...perms);
  };

  const hasAllPermissions = (...perms: bigint[]): boolean => {
    if (!query.data && !rolePermissions) return false;
    return PermissionUtils.hasAllPermissions(permissions, ...perms);
  };

  const getPermissionNames = (): string[] => {
    if (!query.data && !rolePermissions) return [];
    return PermissionUtils.getPermissionNames(permissions);
  };

  const hasRoleCheck = (requiredRoles: OrganizationRole[]): boolean => {
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  const isOwner = role === "owner";
  const isAdmin = role === "admin" || role === "owner";
  const isSupport = role === "support" || role === "admin" || role === "owner";

  return {
    // Data
    permissions,
    role,
    roles,
    guildId: guildId || undefined,

    // Query states
    isLoading: query.isLoading,
    error: query.error,

    // Helper functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole: hasRoleCheck,
    getPermissionNames,

    // Role checks
    isOwner,
    isAdmin,
    isSupport,

    // Actions
    refetch: query.refetch,
  };
}

// Re-export permission flags for convenience
export { PermissionFlags } from "@ticketsbot/auth";