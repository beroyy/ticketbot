import { createContext } from "./index";
import { PermissionUtils } from "../permissions/utils";
import { ContextNotFoundError, PermissionDeniedError, ActorValidationError } from "./errors";

export type DiscordActor = {
  type: "discord_user";
  properties: {
    userId: string;
    username: string;
    guildId: string;
    channelId?: string;
    permissions: bigint;
    locale?: string;
  };
};

export type WebActor = {
  type: "web_user";
  properties: {
    userId: string;
    email: string;
    discordId?: string;
    selectedGuildId?: string;
    permissions: bigint;
    session: any;
  };
};

export type SystemActor = {
  type: "system";
  properties: {
    identifier: string;
  };
};

export type Actor = DiscordActor | WebActor | SystemActor;

export namespace Actor {
  export const Context = createContext<Actor>();

  export const use = (): Actor => {
    try {
      return Context.use();
    } catch {
      throw new ContextNotFoundError("Actor");
    }
  };

  export const maybeUse = () => Context.tryUse();

  export const userId = (): string => {
    const actor = use();
    if (actor.type === "system") {
      throw new ActorValidationError("System actor has no user ID");
    }
    return actor.properties.userId;
  };

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

  export const hasPermission = (flag: bigint): boolean => {
    const actor = use();
    if (actor.type === "system") return true;
    return PermissionUtils.hasPermission(actor.properties.permissions, flag);
  };

  export const requirePermission = (flag: bigint): void => {
    if (!hasPermission(flag)) {
      const permissionNames = PermissionUtils.getPermissionNames(flag).join(", ");
      const actor = use();
      throw new PermissionDeniedError(permissionNames, actor.type);
    }
  };

  export const provide = <R>(actor: Actor, fn: () => R): R => Context.provide(actor, fn);

  export const provideAsync = <R>(actor: Actor, fn: () => Promise<R>): Promise<R> =>
    Context.provideAsync(actor, fn);
}
