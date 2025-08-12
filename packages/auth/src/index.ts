export { auth } from "./auth";

export { type User, type Session, type AuthSession } from "./types";

export { linkDiscordAccount, ensureDiscordLinked, getDiscordAccount } from "./services/user-linking";

export { getSession, getSessionFromContext, requireSession } from "./services/session";

export { 
  AuthPermissionUtils,
  PermissionUtils,
  PermissionFlags,
  ALL_PERMISSIONS,
  DefaultRolePermissions,
  PermissionCategories,
  type PermissionFlag,
  type PermissionValue
} from "./services/permissions";

export {
  type OrganizationRole,
  RolePermissions,
  getUserRole,
  hasRole,
  getRolePermissions,
  getUserPermissionsFromRole,
  hasPermissionViaRole,
  assignRole,
  removeRole,
  updateRole,
  getGuildMembers,
  initializeGuildRoles
} from "./services/roles";

export { createLogger } from "./utils/logger";
