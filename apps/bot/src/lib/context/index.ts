import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Bot-specific context for Discord interactions
 * Provides user, guild, and permission information from Discord
 */
export interface BotContext {
  userId: string;
  username: string;
  guildId: string;
  channelId?: string;
  permissions: bigint;
  locale?: string;
}

// Create the AsyncLocalStorage instance for bot context
const contextStorage = new AsyncLocalStorage<BotContext>();

/**
 * Bot context management for Discord interactions
 */
export const BotContext = {
  /**
   * Provide context for a synchronous operation
   */
  provide<T>(context: BotContext, fn: () => T): T {
    return contextStorage.run(context, fn);
  },

  /**
   * Provide context for an async operation
   */
  async provideAsync<T>(context: BotContext, fn: () => Promise<T>): Promise<T> {
    return contextStorage.run(context, fn);
  },

  /**
   * Get the current context (throws if not available)
   */
  get(): BotContext {
    const ctx = contextStorage.getStore();
    if (!ctx) {
      throw new Error("No bot context available - ensure command is wrapped with BotContext.provide");
    }
    return ctx;
  },

  /**
   * Try to get the current context (returns undefined if not available)
   */
  tryGet(): BotContext | undefined {
    return contextStorage.getStore();
  },

  /**
   * Get the current user ID from context
   */
  userId(): string {
    return this.get().userId;
  },

  /**
   * Get the current guild ID from context
   */
  guildId(): string {
    return this.get().guildId;
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
      throw new Error(`Missing required permission: 0x${flag.toString(16)}`);
    }
  },
};