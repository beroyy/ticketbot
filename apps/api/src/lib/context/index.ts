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
  permissions: bigint;
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
   * Check if the current context has a specific permission
   */
  hasPermission(flag: bigint): boolean {
    const ctx = this.get();
    return (ctx.permissions & flag) === flag;
  },

  /**
   * Require a specific permission (throws if not present)
   */
  requirePermission(flag: bigint): void {
    if (!this.hasPermission(flag)) {
      throw new PermissionDeniedError(flag);
    }
  },
};

/**
 * Custom error for permission denied scenarios
 */
export class PermissionDeniedError extends Error {
  constructor(public readonly requiredPermission: bigint) {
    super(`Permission denied: missing permission 0x${requiredPermission.toString(16)}`);
    this.name = "PermissionDeniedError";
  }
}