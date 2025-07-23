/**
 * Re-export permission constants for backwards compatibility
 * New code should import directly from permissions-constants
 */

export {
  PermissionFlags,
  type PermissionFlag,
  type PermissionValue,
  ALL_PERMISSIONS,
  PermissionCategories,
  DefaultRolePermissions,
} from "./permissions-constants";
