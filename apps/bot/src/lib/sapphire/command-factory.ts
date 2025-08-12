import type { Command, PreconditionEntryResolvable } from "@sapphire/framework";
import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { BaseCommand } from "@bot/lib/sapphire/base-command";
import { type Result, match } from "@bot/lib/discord-utils/result";
import { InteractionResponse } from "@bot/lib/discord-utils/responses";

export interface CommandConfig<T = void> {
  name: string;
  description: string;
  preconditions?: readonly PreconditionEntryResolvable[];
  options?: (
    builder: SlashCommandBuilder
  ) => SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<Result<T>>;
  onSuccess?: (interaction: ChatInputCommandInteraction, result: T) => Promise<void>;
  onError?: (interaction: ChatInputCommandInteraction, error: string) => Promise<void>;
}

/**
 * Create a command class from a functional configuration
 */
export const createCommand = <T = void>(config: CommandConfig<T>): typeof BaseCommand => {
  return class GeneratedCommand extends BaseCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
      super(context, {
        ...options,
        name: config.name,
        description: config.description,
        preconditions: config.preconditions || [],
      });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
      registry.registerChatInputCommand((builder) => {
        builder.setName(config.name).setDescription(config.description);

        if (config.options) {
          return config.options(builder as SlashCommandBuilder);
        }

        return builder;
      });
    }

    public override async chatInputRunWithContext(interaction: ChatInputCommandInteraction) {
      const result = await config.execute(interaction);

      await match(result, {
        ok: async (value) => {
          if (config.onSuccess) {
            await config.onSuccess(interaction, value);
          }
        },
        err: async (error) => {
          if (config.onError) {
            await config.onError(interaction, error);
          } else {
            await InteractionResponse.error(interaction, error);
          }
        },
      });
    }
  };
};

/**
 * Compose multiple command configurations
 */
export const composeCommands = (...configs: CommandConfig[]): Array<typeof BaseCommand> => {
  return configs.map((config) => createCommand(config)) as Array<typeof BaseCommand>;
};

/**
 * Create a command with subcommands
 */
export interface SubcommandConfig<T = void> {
  name: string;
  description: string;
  options?: (builder: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<Result<T>>;
}

export interface CommandGroupConfig {
  name: string;
  description: string;
  preconditions?: readonly PreconditionEntryResolvable[];
  subcommands: Record<string, SubcommandConfig>;
  defaultSubcommand?: string;
}

export const createCommandGroup = (config: CommandGroupConfig): typeof BaseCommand => {
  return class GeneratedCommandGroup extends BaseCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
      super(context, {
        ...options,
        name: config.name,
        description: config.description,
        preconditions: config.preconditions || [],
      });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
      registry.registerChatInputCommand((builder) => {
        builder.setName(config.name).setDescription(config.description);

        // Add all subcommands
        for (const [name, subcommand] of Object.entries(config.subcommands)) {
          builder.addSubcommand((sub) => {
            sub.setName(name).setDescription(subcommand.description);
            if (subcommand.options) {
              return subcommand.options(sub);
            }
            return sub;
          });
        }

        return builder;
      });
    }

    public override async chatInputRunWithContext(interaction: ChatInputCommandInteraction) {
      const subcommandName = interaction.options.getSubcommand();
      const subcommand = config.subcommands[subcommandName];

      if (!subcommand) {
        await InteractionResponse.error(interaction, `Unknown subcommand: ${subcommandName}`);
        return;
      }

      const result = await subcommand.execute(interaction);

      await match(result, {
        ok: async () => {
          // Subcommands handle their own success responses
        },
        err: async (error) => {
          await InteractionResponse.error(interaction, error);
        },
      });
    }
  };
};

/**
 * Create a simple reply command
 */
export const createSimpleCommand = (
  name: string,
  description: string,
  reply: string | (() => string | Promise<string>),
  options?: Partial<CommandConfig>
): typeof BaseCommand => {
  return createCommand({
    name,
    description,
    ...options,
    execute: async (interaction) => {
      const response = typeof reply === "function" ? await reply() : reply;
      await interaction.reply(response);
      return { ok: true, value: undefined };
    },
  });
};

/**
 * Create a command that requires confirmation
 */
export const createConfirmCommand = <T = void>(
  config: CommandConfig<T> & {
    confirmMessage: string;
    confirmButtonLabel?: string;
    cancelButtonLabel?: string;
    timeout?: number;
  }
): typeof BaseCommand => {
  return createCommand({
    ...config,
    execute: async (interaction) => {
      // This would need button handling logic
      // For now, just execute directly
      return config.execute(interaction);
    },
  });
};
