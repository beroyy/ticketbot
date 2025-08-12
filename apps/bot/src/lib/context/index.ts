import { AsyncLocalStorage } from "node:async_hooks";

export type BotContext = {
  userId: string;
  username: string;
  guildId: string;
  channelId?: string;
  role?: string;
  locale?: string;
};

const contextStorage = new AsyncLocalStorage<BotContext>();

export const BotContext = {
  provide<T>(context: BotContext, fn: () => T): T {
    return contextStorage.run(context, fn);
  },

  async provideAsync<T>(context: BotContext, fn: () => Promise<T>): Promise<T> {
    return contextStorage.run(context, fn);
  },

  get(): BotContext {
    const ctx = contextStorage.getStore();
    if (!ctx) {
      throw new Error(
        "No bot context available - ensure command is wrapped with BotContext.provide"
      );
    }
    return ctx;
  },

  tryGet(): BotContext | undefined {
    return contextStorage.getStore();
  },

  userId(): string {
    return this.get().userId;
  },

  guildId(): string {
    return this.get().guildId;
  },

  hasRole(roles: string | string[]): boolean {
    const ctx = this.get();
    if (!ctx.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(ctx.role);
  },

  requireRole(roles: string | string[]): void {
    if (!this.hasRole(roles)) {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      throw new Error(`Missing required role: ${roleArray.join(", ")}`);
    }
  },
};
