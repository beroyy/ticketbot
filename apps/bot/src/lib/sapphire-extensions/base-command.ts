import { Command } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";
import { parseDiscordId } from "@ticketsbot/core";

/**
 * Permission provider interface that bots must implement
 */
export interface PermissionProvider {
  /**
   * Get user permissions for a guild
   */
  getUserPermissions(guildId: string, userId: string): Promise<bigint> | bigint;
}

// Global permission provider - must be configured by the bot
let permissionProvider: PermissionProvider | null = null;

/**
 * Configure the permission provider used by BaseCommand
 */
export function configurePermissionProvider(provider: PermissionProvider) {
  permissionProvider = provider;
}

/**
 * Base command class that automatically wraps execution with Discord context
 * All commands should extend this instead of Sapphire's Command
 */
export abstract class BaseCommand extends Command {
  /**
   * Override the base chatInputRun to wrap with context
   * Subclasses should implement chatInputRunWithContext instead
   */
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    // Get user permissions for the guild
    let permissions = 0n;

    if (interaction.guild && permissionProvider) {
      permissions = await permissionProvider.getUserPermissions(
        interaction.guild.id,
        interaction.user.id
      );
    }

    // Create Discord actor context
    const actor: DiscordActor = {
      type: "discord_user",
      properties: {
        userId: parseDiscordId(interaction.user.id),
        username: interaction.user.username,
        guildId: interaction.guild ? parseDiscordId(interaction.guild.id) : "",
        channelId: interaction.channelId ? parseDiscordId(interaction.channelId) : undefined,
        permissions,
        locale: interaction.locale,
      },
    };

    // Execute the command within Discord context
    return Actor.Context.provideAsync(actor, () => this.chatInputRunWithContext(interaction));
  }

  /**
   * Subclasses implement this method instead of chatInputRun
   * The context will be automatically available via Actor.use()
   */
  public abstract chatInputRunWithContext(
    interaction: ChatInputCommandInteraction
  ): Promise<unknown>;
}
