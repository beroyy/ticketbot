// Core auth exports
export { auth } from "./auth";
export { type User, type Session, type AuthSession } from "./types";

// Service exports
export { linkDiscordAccount, ensureDiscordLinked } from "./services/discord-link";

// Session management
export { getSession, getSessionFromContext, requireSession } from "./services/session";

// Permission utilities
export { AuthPermissionUtils } from "./services/permissions";
