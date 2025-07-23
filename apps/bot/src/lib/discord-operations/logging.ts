import { container } from "@sapphire/framework";
import { getSettingsUnchecked } from "@ticketsbot/core/domains";
import type { EmbedBuilder, TextChannel } from "discord.js";

/**
 * Sends an embed to a guild's configured log channel
 * @param guildId - The guild ID
 * @param embed - The embed to send
 * @returns Promise<boolean> - True if successfully sent, false otherwise
 */
export const sendToLogChannel = async (
  guildId: string,
  embed: EmbedBuilder
): Promise<boolean> => {
  try {
    // Get guild settings to find log channel
    const settings = await getSettingsUnchecked(guildId);
    if (!settings?.settings?.logChannel) {
      container.logger.debug(`No log channel configured for guild ${guildId}`);
      return false;
    }

    // Get the guild
    const guild = container.client.guilds.cache.get(guildId);
    if (!guild) {
      container.logger.debug(`Guild ${guildId} not in cache`);
      return false;
    }

    // Get the log channel
    const logChannel = guild.channels.cache.get(settings.settings.logChannel) as TextChannel;
    if (!logChannel?.isTextBased()) {
      container.logger.debug(
        `Log channel ${settings.settings.logChannel} not found or not text-based`
      );
      return false;
    }

    // Add guild footer if not already set
    if (!embed.data.footer) {
      embed.setFooter({ 
        text: guild.name, 
        iconURL: guild.iconURL() ?? undefined 
      });
    }

    // Send the embed
    await logChannel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    container.logger.error(`Error sending to log channel for guild ${guildId}:`, error);
    return false;
  }
};

/**
 * Creates a log channel sender with error handling
 * @param eventName - Name of the event for logging purposes
 * @returns Function that sends embeds to log channels
 */
export const createLogChannelSender = (eventName: string) => {
  return async (guildId: string, embed: EmbedBuilder): Promise<void> => {
    const sent = await sendToLogChannel(guildId, embed);
    if (!sent) {
      container.logger.debug(`Could not send ${eventName} log to guild ${guildId}`);
    }
  };
};