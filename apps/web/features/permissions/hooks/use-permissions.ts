import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import type { OrganizationRole } from "@ticketsbot/auth";
import { useAuth } from "@/features/auth";
import { permissionQueries } from "../queries";

interface UsePermissionsReturn {
  // Data
  role: OrganizationRole | null;
  guildId?: string;

  // Query states
  isLoading: boolean;
  error: unknown;

  // Role checks
  isOwner: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  hasRole: (requiredRoles: OrganizationRole[]) => boolean;

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

  // Extract role from query data
  const role = query.data?.role || null;

  // Helper function for role checking
  const hasRoleCheck = (requiredRoles: OrganizationRole[]): boolean => {
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  // Role hierarchy checks
  const isOwner = role === "owner";
  const isAdmin = role === "admin" || role === "owner";
  const isSupport = role === "support" || role === "admin" || role === "owner";

  return {
    // Data
    role,
    guildId: guildId || undefined,

    // Query states
    isLoading: query.isLoading,
    error: query.error,

    // Role checks
    isOwner,
    isAdmin,
    isSupport,
    hasRole: hasRoleCheck,

    // Actions
    refetch: query.refetch,
  };
}