// Client-safe exports that don't import Prisma
// These can be safely imported in browser environments

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

export { type User, type Session, type AuthSession } from "./types";