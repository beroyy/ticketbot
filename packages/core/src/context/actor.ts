import { createContext } from "./index";
import { PermissionUtils } from "../permissions/utils";
import { ContextNotFoundError, PermissionDeniedError, ActorValidationError } from "./errors";

/**
 * Actor context for unified authentication across Discord and web users
 * Production-ready implementation with proper error handling
 */

export interface DiscordActor {
  type: "discord_user";
  properties: {
    userId: string;
    username: string;
    guildId: string;
    channelId?: string;
    permissions: bigint;
    locale?: string;
  };
}

export interface WebActor {
  type: "web_user";
  properties: {
    userId: string;
    email: string;
    discordId?: string;
    selectedGuildId?: string;
    permissions: bigint;
    session: any; // Avoid circular dependency with auth package
  };
}

export interface SystemActor {
  type: "system";
  properties: {
    identifier: string;
  };
}

export type Actor = DiscordActor | WebActor | SystemActor;

export namespace Actor {
  export const Context = createContext<Actor>("Actor");

  /**
   * Get the current actor or throw if not available
   */
  export const use = (): Actor => {
    try {
      return Context.use();
    } catch {
      throw new ContextNotFoundError("Actor");
    }
  };

  /**
   * Get the current actor or return undefined
   */
  export const maybeUse = () => Context.tryUse();

  /**
   * Get the current user ID regardless of actor type
   */
  export const userId = (): string => {
    const actor = use();
    if (actor.type === "system") {
      throw new ActorValidationError("System actor has no user ID");
    }
    return actor.properties.userId;
  };

  /**
   * Get the current guild ID or throw if not available
   */
  export const guildId = (): string => {
    const actor = use();
    if (actor.type === "discord_user") {
      return actor.properties.guildId;
    }
    if (actor.type === "web_user" && actor.properties.selectedGuildId) {
      return actor.properties.selectedGuildId;
    }
    throw new ActorValidationError("No guild context available");
  };

  /**
   * Check if the current actor has a specific permission
   */
  export const hasPermission = (flag: bigint): boolean => {
    const actor = use();
    if (actor.type === "system") return true;
    return PermissionUtils.hasPermission(actor.properties.permissions, flag);
  };

  /**
   * Require a specific permission or throw
   */
  export const requirePermission = (flag: bigint): void => {
    if (!hasPermission(flag)) {
      const permissionNames = PermissionUtils.getPermissionNames(flag).join(", ");
      const actor = use();
      throw new PermissionDeniedError(permissionNames, actor.type);
    }
  };

  /**
   * Provide actor context for a callback
   */
  export const provide = <R>(actor: Actor, fn: () => R): R => Context.provide(actor, fn);

  /**
   * Provide actor context for an async callback
   */
  export const provideAsync = <R>(actor: Actor, fn: () => Promise<R>): Promise<R> =>
    Context.provideAsync(actor, fn);
}
