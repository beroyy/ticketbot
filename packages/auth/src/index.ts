export { auth } from "./auth";

export { type User, type Session, type AuthSession } from "./types";

export { linkDiscordAccount, ensureDiscordLinked, getDiscordAccount } from "./services/user-linking";

export { getSession, getSessionFromContext, requireSession } from "./services/session";

export {
  type OrganizationRole,
  getUserRole,
  hasRole,
  assignRole,
  removeRole,
  updateRole,
  getGuildMembers,
  initializeGuildRoles
} from "./services/roles";

export { createLogger } from "./utils/logger";
