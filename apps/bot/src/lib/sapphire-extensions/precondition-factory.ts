import {
  Precondition,
  type AsyncPreconditionResult,
  type PreconditionContext,
  type ChatInputCommand,
} from "@sapphire/framework";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { parseDiscordId, PermissionUtils } from "@ticketsbot/core";
import { Team } from "@ticketsbot/core/domains";
import { findByChannelId } from "@ticketsbot/core/domains/ticket";
import { PreconditionErrors } from "@bot/lib/discord-utils/error-handlers";

/**
 * Base precondition configuration
 */
export interface PreconditionConfig {
  name: string;
  check: (
    interaction: ChatInputCommandInteraction,
    command: ChatInputCommand,
    context: PreconditionContext
  ) => Promise<AsyncPreconditionResult>;
}

/**
 * Guild precondition configuration
 */
export interface GuildPreconditionConfig {
  name: string;
  check?: (
    interaction: ChatInputCommandInteraction & {
      guild: NonNullable<ChatInputCommandInteraction["guild"]>;
      member: GuildMember;
    },
    command: ChatInputCommand,
    context: PreconditionContext
  ) => Promise<AsyncPreconditionResult>;
}

/**
 * Permission precondition configuration
 */
export interface PermissionPreconditionConfig {
  name: string;
  permission?: bigint;
  getPermission?: (context: PreconditionContext) => bigint;
  allowGuildOwner?: boolean;
  allowDiscordAdmin?: boolean;
  customCheck?: (
    interaction: ChatInputCommandInteraction,
    guildId: string,
    userId: string
  ) => Promise<boolean>;
}

/**
 * Ticket precondition configuration
 */
export interface TicketPreconditionConfig {
  name: string;
  storeTicket?: boolean;
  check?: (
    interaction: ChatInputCommandInteraction,
    ticket: any,
    command: ChatInputCommand,
    context: PreconditionContext,
    precondition: Precondition
  ) => AsyncPreconditionResult;
}

/**
 * Create a basic precondition
 */
export const createPrecondition = (config: PreconditionConfig): any => {
  return class GeneratedPrecondition extends Precondition {
    public static override readonly name = config.name;

    public override async chatInputRun(
      interaction: ChatInputCommandInteraction,
      command: ChatInputCommand,
      context: PreconditionContext
    ): AsyncPreconditionResult {
      return config.check(interaction, command, context);
    }
  };
};

/**
 * Create a guild-only precondition
 */
export const createGuildPrecondition = (config: GuildPreconditionConfig): any => {
  return class GeneratedGuildPrecondition extends Precondition {
    public static override readonly name = config.name;

    public override async chatInputRun(
      interaction: ChatInputCommandInteraction,
      command: ChatInputCommand,
      context: PreconditionContext
    ): AsyncPreconditionResult {
      if (!interaction.guild || !interaction.member) {
        return this.error({
          message: PreconditionErrors.guildOnly,
          context: { silent: true },
        });
      }

      // If no custom check, just validate guild presence
      if (!config.check) {
        return this.ok();
      }

      // Cast to proper type for the check function
      const guildInteraction = interaction as ChatInputCommandInteraction & {
        guild: NonNullable<ChatInputCommandInteraction["guild"]>;
        member: GuildMember;
      };

      return config.check(guildInteraction, command, context);
    }
  };
};

/**
 * Create a permission-based precondition
 */
export const createPermissionPrecondition = (config: PermissionPreconditionConfig): any => {
  return class GeneratedPermissionPrecondition extends Precondition {
    public static override readonly name = config.name;

    public override async chatInputRun(
      interaction: ChatInputCommandInteraction,
      command: ChatInputCommand,
      context: PreconditionContext
    ): AsyncPreconditionResult {
      if (!interaction.guild || !interaction.member) {
        return this.error({
          message: PreconditionErrors.guildOnly,
          context: { silent: true },
        });
      }

      const member = interaction.member as GuildMember;
      const guildId = parseDiscordId(interaction.guild.id);
      const userId = parseDiscordId(interaction.user.id);

      // Check if user is guild owner (if allowed)
      if (config.allowGuildOwner !== false && interaction.guild.ownerId === interaction.user.id) {
        return this.ok();
      }

      // Custom permission check
      if (config.customCheck) {
        const hasPermission = await config.customCheck(interaction, guildId, userId);
        if (hasPermission) {
          return this.ok();
        }
      }

      // Standard permission check
      if (config.permission !== undefined || config.getPermission) {
        const permission = config.getPermission?.(context) ?? config.permission!;
        const hasPermission = await Team.hasPermission(guildId, userId, permission);

        if (hasPermission) {
          return this.ok();
        }
      }

      // Discord admin fallback (if allowed)
      if (
        config.allowDiscordAdmin !== false &&
        member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return this.ok();
      }

      // Get permission names for error message
      const permission = config.getPermission?.(context) ?? config.permission;
      if (permission) {
        const permissionNames = PermissionUtils.getPermissionNames(permission);
        return this.error({
          message: PreconditionErrors.missingPermission(permissionNames),
          context: { silent: true },
        });
      }

      return this.error({
        message: PreconditionErrors.adminOnly,
        context: { silent: true },
      });
    }
  };
};

/**
 * Create a ticket-based precondition
 */
export const createTicketPrecondition = (config: TicketPreconditionConfig): any => {
  return class GeneratedTicketPrecondition extends Precondition {
    public static override readonly name = config.name;

    public override async chatInputRun(
      interaction: ChatInputCommandInteraction,
      command: ChatInputCommand,
      context: PreconditionContext
    ): AsyncPreconditionResult {
      if (!interaction.channel) {
        return this.error({
          message: PreconditionErrors.notInChannel,
          context: { silent: true },
        });
      }

      // Check if we're in a ticket channel
      const ticket = await findByChannelId(parseDiscordId(interaction.channel.id));

      if (!ticket) {
        return this.error({
          message: PreconditionErrors.notTicketChannel,
          context: { silent: true },
        });
      }

      // Store ticket for command use if requested
      if (config.storeTicket !== false) {
        Reflect.set(interaction, "ticket", ticket);
      }

      // If no custom check, just validate ticket presence
      if (!config.check) {
        return this.ok();
      }

      return config.check(interaction, ticket, command, context, this);
    }
  };
};

/**
 * Declare module augmentation for all factory-created preconditions
 */
declare module "@sapphire/framework" {
  interface Preconditions {
    "guild-only": never;
    "admin-only": never;
    "team-only": never;
    "ticket-channel-only": never;
    "can-close-ticket": never;
    "has-permission": PreconditionContext & { permission: bigint };
  }
}
