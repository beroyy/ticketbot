import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  Interaction,
} from "discord.js";
import type { Result } from "@bot/lib/utils/result";
import { BotContext } from "@bot/lib/context";
import { parseDiscordId } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";

/**
 * Helper to wrap handler execution with Discord context
 */
async function withContext<T extends Interaction, R>(
  interaction: T,
  handler: (interaction: T) => Promise<R>
): Promise<R> {
  // Get user permissions for the guild
  let permissions = 0n;

  if (interaction.guild) {
    try {
      permissions = await db.role.getUserPermissions(
        parseDiscordId(interaction.user.id),
        parseDiscordId(interaction.guild.id)
      );
    } catch (error) {
      // Log but don't fail - permissions default to 0n
      console.error("Error getting user permissions:", error);
    }
  }

  // Create bot context from Discord interaction
  const context: BotContext = {
    userId: parseDiscordId(interaction.user.id),
    username: interaction.user.username,
    guildId: interaction.guild ? parseDiscordId(interaction.guild.id) : "",
    channelId: interaction.channelId ? parseDiscordId(interaction.channelId) : undefined,
    permissions,
    locale: interaction.locale,
  };

  // Execute the handler within bot context
  return BotContext.provideAsync(context, () => handler(interaction));
}

/**
 * Handler function types
 */
export type ButtonHandler<T = void> = (interaction: ButtonInteraction) => Promise<Result<T>>;
export type ModalHandler<T = void> = (interaction: ModalSubmitInteraction) => Promise<Result<T>>;
export type SelectHandler<T = void> = (
  interaction: StringSelectMenuInteraction
) => Promise<Result<T>>;

/**
 * Handler configuration
 */
export interface HandlerConfig<T = void> {
  pattern: string | RegExp;
  handler: ButtonHandler<T> | ModalHandler<T> | SelectHandler<T>;
  errorHandler?: (interaction: Interaction, error: string) => Promise<void>;
  preconditions?: Array<(interaction: Interaction) => Promise<Result<void>>>;
}

/**
 * Create a button handler with pattern matching and automatic context
 */
export const createButtonHandler = <T = void>(config: HandlerConfig<T>) => {
  const matches = (customId: string) =>
    typeof config.pattern === "string"
      ? customId === config.pattern
      : config.pattern.test(customId);

  const handle = async (interaction: ButtonInteraction): Promise<Result<T>> => {
    // Run preconditions
    if (config.preconditions) {
      for (const precondition of config.preconditions) {
        const result = await precondition(interaction);
        if (!result.ok) return result;
      }
    }

    // Wrap handler execution with context
    return withContext(interaction, config.handler as ButtonHandler<T>);
  };

  return {
    matches,
    handle,
    errorHandler: config.errorHandler,
  };
};

/**
 * Create a modal handler with pattern matching and automatic context
 */
export const createModalHandler = <T = void>(config: HandlerConfig<T>) => {
  const matches = (customId: string) =>
    typeof config.pattern === "string"
      ? customId === config.pattern
      : config.pattern.test(customId);

  const handle = async (interaction: ModalSubmitInteraction): Promise<Result<T>> => {
    // Run preconditions
    if (config.preconditions) {
      for (const precondition of config.preconditions) {
        const result = await precondition(interaction);
        if (!result.ok) return result;
      }
    }

    // Wrap handler execution with context
    return withContext(interaction, config.handler as ModalHandler<T>);
  };

  return {
    matches,
    handle,
    errorHandler: config.errorHandler,
  };
};

/**
 * Create a select menu handler with pattern matching and automatic context
 */
export const createSelectHandler = <T = void>(config: HandlerConfig<T>) => {
  const matches = (customId: string) =>
    typeof config.pattern === "string"
      ? customId === config.pattern
      : config.pattern.test(customId);

  const handle = async (interaction: StringSelectMenuInteraction): Promise<Result<T>> => {
    // Run preconditions
    if (config.preconditions) {
      for (const precondition of config.preconditions) {
        const result = await precondition(interaction);
        if (!result.ok) return result;
      }
    }

    // Wrap handler execution with context
    return withContext(interaction, config.handler as SelectHandler<T>);
  };

  return {
    matches,
    handle,
    errorHandler: config.errorHandler,
  };
};

/**
 * Extract ID from custom ID using pattern
 */
export const withIdExtraction = (pattern: RegExp) => {
  return (customId: string): string | null => {
    const match = customId.match(pattern);
    return match ? match[1] || null : null;
  };
};

/**
 * Create a Sapphire InteractionHandler from handler configs
 */
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
