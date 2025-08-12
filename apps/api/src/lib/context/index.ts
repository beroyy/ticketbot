import { AsyncLocalStorage } from "node:async_hooks";

/**
 * API-specific context for web requests
 * Provides user, session, and permission information from HTTP requests
 */
export interface ApiContext {
  userId: string;
  email: string;
  discordId?: string;
  selectedGuildId?: string;
  role?: string;
  session: any;
}

// Create the AsyncLocalStorage instance for API context
const contextStorage = new AsyncLocalStorage<ApiContext>();

/**
 * API context management for HTTP requests
 */
export const ApiContext = {
  /**
   * Provide context for a synchronous operation
   */
  provide<T>(context: ApiContext, fn: () => T): T {
    return contextStorage.run(context, fn);
  },

  /**
   * Provide context for an async operation
   */
  async provideAsync<T>(context: ApiContext, fn: () => Promise<T>): Promise<T> {
    return contextStorage.run(context, fn);
  },

  /**
   * Get the current context (throws if not available)
   */
  get(): ApiContext {
    const ctx = contextStorage.getStore();
    if (!ctx) {
      throw new Error("No API context available - ensure request is wrapped with middleware");
    }
    return ctx;
  },

  /**
   * Try to get the current context (returns undefined if not available)
   */
  tryGet(): ApiContext | undefined {
    return contextStorage.getStore();
  },

  /**
   * Get the current user ID from context
   */
  userId(): string {
    return this.get().userId;
  },

  /**
   * Get the selected guild ID from context
   */
  guildId(): string | undefined {
    return this.get().selectedGuildId;
  },

  /**
   * Require a guild to be selected (throws if not)
   */
  requireGuildId(): string {
    const guildId = this.guildId();
    if (!guildId) {
      throw new Error("No guild selected");
    }
    return guildId;
  },

  /**
   * Check if the current context has a specific role
   */
  hasRole(roles: string | string[]): boolean {
    const ctx = this.get();
    if (!ctx.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(ctx.role);
  },

  /**
   * Require a specific role (throws if not present)
   */
  requireRole(roles: string | string[]): void {
    if (!this.hasRole(roles)) {
      throw new RoleDeniedError(roles);
    }
  },
};

/**
 * Custom error for role denied scenarios
 */
export class RoleDeniedError extends Error {
  constructor(public readonly requiredRoles: string | string[]) {
    const roleArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    super(`Role denied: requires one of ${roleArray.join(", ")}`);
    this.name = "RoleDeniedError";
  }
}