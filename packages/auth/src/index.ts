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

export { createLogger } from "./utils/logger";
