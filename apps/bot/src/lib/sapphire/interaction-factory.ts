import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  Interaction,
} from "discord.js";
import type { Result } from "@bot/lib/utils/result";
import { BotContext } from "@bot/lib/context";
import { db } from "@ticketsbot/db";

async function withContext<T extends Interaction, R>(
  interaction: T,
  handler: (interaction: T) => Promise<R>
): Promise<R> {
  let permissions = 0n;

  if (interaction.guild) {
    try {
      permissions = await db.role.getUserPermissions({ userId: interaction.user.id, guildId: interaction.guild.id });
    } catch (error) {
      console.error("Error getting user permissions:", error);
    }
  }

  const context: BotContext = {
    userId: interaction.user.id,
    username: interaction.user.username,
    guildId: interaction.guild ? interaction.guild.id : "",
    channelId: interaction.channelId ? interaction.channelId : undefined,
    permissions,
    locale: interaction.locale,
  };

  return BotContext.provideAsync(context, () => handler(interaction));
}

export type ButtonHandler<T = void> = (interaction: ButtonInteraction) => Promise<Result<T>>;
export type ModalHandler<T = void> = (interaction: ModalSubmitInteraction) => Promise<Result<T>>;
export type SelectHandler<T = void> = (
  interaction: StringSelectMenuInteraction
) => Promise<Result<T>>;

export interface HandlerConfig<T = void> {
  pattern: string | RegExp;
  handler: ButtonHandler<T> | ModalHandler<T> | SelectHandler<T>;
  errorHandler?: (interaction: Interaction, error: string) => Promise<void>;
  preconditions?: Array<(interaction: Interaction) => Promise<Result<void>>>;
}

export const createButtonHandler = <T = void>(config: HandlerConfig<T>) => {
  const matches = (customId: string) =>
    typeof config.pattern === "string"
      ? customId === config.pattern
      : config.pattern.test(customId);

  const handle = async (interaction: ButtonInteraction): Promise<Result<T>> => {
    if (config.preconditions) {
      for (const precondition of config.preconditions) {
        const result = await precondition(interaction);
        if (!result.ok) return result;
      }
    }

    return withContext(interaction, config.handler as ButtonHandler<T>);
  };

  return {
    matches,
    handle,
    errorHandler: config.errorHandler,
  };
};

export const createModalHandler = <T = void>(config: HandlerConfig<T>) => {
  const matches = (customId: string) =>
    typeof config.pattern === "string"
      ? customId === config.pattern
      : config.pattern.test(customId);

  const handle = async (interaction: ModalSubmitInteraction): Promise<Result<T>> => {
    if (config.preconditions) {
      for (const precondition of config.preconditions) {
        const result = await precondition(interaction);
        if (!result.ok) return result;
      }
    }

    return withContext(interaction, config.handler as ModalHandler<T>);
  };

  return {
    matches,
    handle,
    errorHandler: config.errorHandler,
  };
};

export const createSelectHandler = <T = void>(config: HandlerConfig<T>) => {
  const matches = (customId: string) =>
    typeof config.pattern === "string"
      ? customId === config.pattern
      : config.pattern.test(customId);

  const handle = async (interaction: StringSelectMenuInteraction): Promise<Result<T>> => {
    if (config.preconditions) {
      for (const precondition of config.preconditions) {
        const result = await precondition(interaction);
        if (!result.ok) return result;
      }
    }

    return withContext(interaction, config.handler as SelectHandler<T>);
  };

  return {
    matches,
    handle,
    errorHandler: config.errorHandler,
  };
};

export const withIdExtraction = (pattern: RegExp) => {
  return (customId: string): string | null => {
    const match = customId.match(pattern);
    return match ? match[1] || null : null;
  };
};

export const createInteractionHandler = (
  name: string,
  handlers: Array<
    ReturnType<typeof createButtonHandler | typeof createModalHandler | typeof createSelectHandler>
  >
): typeof InteractionHandler => {
  class DynamicInteractionHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
      super(ctx, {
        ...options,
        interactionHandlerType: InteractionHandlerTypes.Button,
      });
    }

    public override parse(
      interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction
    ) {
      const handler = handlers.find((h) => h.matches(interaction.customId));
      return handler ? this.some(handler) : this.none();
    }

    public override async run(
      interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction,
      handler: any
    ) {
      const result = await handler.handle(interaction);

      if (!result.ok && handler.errorHandler) {
        await handler.errorHandler(interaction, result.error);
      }
    }
  }

  Object.defineProperty(DynamicInteractionHandler, "name", { value: name });
  return DynamicInteractionHandler as typeof InteractionHandler;
};
