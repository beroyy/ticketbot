import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/features/auth/auth-provider-ssr";
import { usePermissions } from "@/features/permissions/hooks/use-permissions";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: bigint;
  permissions?: bigint[]; // For OR condition
  fallback?: ReactNode;
  requireGuild?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  fallback,
  requireGuild = true,
}: PermissionGuardProps) {
  const { selectedGuildId } = useAuth();
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions();
  const router = useRouter();

  // If guild is required but none selected
  if (requireGuild && !selectedGuildId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">No Server Selected</h2>
        <p className="mb-6 text-gray-600">Please select a server to access this feature.</p>
        <button
          onClick={() => {
            void router.push("/dashboard");
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Still loading permissions
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-600">Loading permissions...</div>
      </div>
    );
  }

  // Check permissions
  let hasRequiredPermission = true;

  if (permission) {
    hasRequiredPermission = hasPermission(permission);
  }

  if (permissions) {
    hasRequiredPermission = hasAnyPermission(...permissions);
  }

  if (!hasRequiredPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mb-6 text-gray-600">You don&apos;t have permission to access this feature.</p>
        <p className="mb-6 text-sm text-gray-500">
          Please contact your server administrator if you believe this is an error.
        </p>
        <button
          onClick={() => {
            void router.push("/dashboard");
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
