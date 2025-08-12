import { AsyncLocalStorage } from "node:async_hooks";

export type BotContext = {
  userId: string;
  username: string;
  guildId: string;
  channelId?: string;
  permissions: bigint;
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

  hasPermission(flag: bigint): boolean {
    const ctx = this.get();
    return (ctx.permissions & flag) === flag;
  },

  requirePermission(flag: bigint): void {
    if (!this.hasPermission(flag)) {
      throw new Error(`Missing required permission: 0x${flag.toString(16)}`);
    }
  },
};
