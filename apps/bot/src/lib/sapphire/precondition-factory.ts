import {
  Precondition,
  type AsyncPreconditionResult,
  type PreconditionContext,
  type ChatInputCommand,
} from "@sapphire/framework";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { PermissionUtils } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";
import { PreconditionErrors } from "@bot/lib/utils/error-handlers";

export type PreconditionConfig = {
  name: string;
  check: (
    interaction: ChatInputCommandInteraction,
    command: ChatInputCommand,
    context: PreconditionContext
  ) => Promise<AsyncPreconditionResult>;
};

export type GuildPreconditionConfig = {
  name: string;
  check?: (
    interaction: ChatInputCommandInteraction & {
      guild: NonNullable<ChatInputCommandInteraction["guild"]>;
      member: GuildMember;
    },
    command: ChatInputCommand,
    context: PreconditionContext
  ) => Promise<AsyncPreconditionResult>;
};

export type PermissionPreconditionConfig = {
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
};

export type TicketPreconditionConfig = {
  name: string;
  storeTicket?: boolean;
  check?: (
    interaction: ChatInputCommandInteraction,
    ticket: any,
    command: ChatInputCommand,
    context: PreconditionContext,
    precondition: Precondition
  ) => AsyncPreconditionResult;
};

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

      if (!config.check) {
        return this.ok();
      }

      const guildInteraction = interaction as ChatInputCommandInteraction & {
        guild: NonNullable<ChatInputCommandInteraction["guild"]>;
        member: GuildMember;
      };

      return config.check(guildInteraction, command, context);
    }
  };
};

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
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      if (config.allowGuildOwner !== false && interaction.guild.ownerId === interaction.user.id) {
        return this.ok();
      }

      if (config.customCheck) {
        const hasPermission = await config.customCheck(interaction, guildId, userId);
        if (hasPermission) {
          return this.ok();
        }
      }

      if (config.permission !== undefined || config.getPermission) {
        const permission = config.getPermission?.(context) ?? config.permission!;
        const hasPermission = await db.role.hasPermission(guildId, userId, permission);

        if (hasPermission) {
          return this.ok();
        }
      }

      if (
        config.allowDiscordAdmin !== false &&
        member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return this.ok();
      }

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

      const ticket = await db.ticket.getByChannelId(interaction.channel.id);

      if (!ticket) {
        return this.error({
          message: PreconditionErrors.notTicketChannel,
          context: { silent: true },
        });
      }

      if (config.storeTicket !== false) {
        Reflect.set(interaction, "ticket", ticket);
      }

      if (!config.check) {
        return this.ok();
      }

      return config.check(interaction, ticket, command, context, this);
    }
  };
};

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
