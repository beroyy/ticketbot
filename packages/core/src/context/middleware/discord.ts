import { Actor, type DiscordActor } from "../actor";
import { PermissionFlags } from "../../schemas/permissions";

// Type definitions to avoid discord.js dependency
interface BaseInteraction {
  guild: { id: string } | null;
  member: unknown;
  user: { id: string; username: string };
  channelId: string;
  locale: string;
  memberPermissions?: { has: (perm: string) => boolean };
}

type CommandInteraction = BaseInteraction;
type ButtonInteraction = BaseInteraction;
type StringSelectMenuInteraction = BaseInteraction;
type ModalSubmitInteraction = BaseInteraction;

type DiscordInteraction =
  | CommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;

/**
 * Discord.js middleware for providing actor context in interactions
 */
export async function withDiscordContext<T>(
  interaction: DiscordInteraction,
  handler: () => Promise<T>
): Promise<T> {
  // Ensure interaction is from a guild
  if (!interaction.guild || !interaction.member) {
    throw new Error("This interaction must be used in a guild");
  }

  // Calculate user permissions
  const permissions = await calculateUserPermissions(interaction);

  // Create Discord actor
  const actor: DiscordActor = {
    type: "discord_user",
    properties: {
      userId: interaction.user.id,
      username: interaction.user.username,
      guildId: interaction.guild.id,
      channelId: interaction.channelId,
      permissions,
      locale: interaction.locale,
    },
  };

  // Execute handler with context
  return Actor.provideAsync(actor, handler);
}

/**
 * Calculate effective permissions for a Discord user
 * This is a placeholder - implement based on your permission system
 */
async function calculateUserPermissions(interaction: DiscordInteraction): Promise<bigint> {
  // TODO: Implement actual permission calculation
  // This would typically:
  // 1. Check Discord role permissions
  // 2. Query database for custom permissions
  // 3. Apply any overrides

  // For now, return a default set of permissions
  if (interaction.memberPermissions?.has("Administrator")) {
    // Return all permissions for administrators
    return Object.values(PermissionFlags).reduce((acc, flag) => acc | flag, 0n);
  }

  return PermissionFlags.TICKET_VIEW_ALL;
}

/**
 * Decorator for Discord command handlers
 */
export function discordCommand<T extends DiscordInteraction>(
  handler: (interaction: T) => Promise<void>
): (interaction: T) => Promise<void> {
  return async (interaction: T) => {
    return withDiscordContext(interaction, () => handler(interaction));
  };
}
