import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { parseDiscordId } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";

export const GuildCreateListener = ListenerFactory.on("guildCreate", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  try {
    const guildId = parseDiscordId(guild.id);
    const ownerId = parseDiscordId(guild.ownerId);

    // Fetch owner info first (Discord API call)
    const owner = await guild.fetchOwner();
    logger.info(`📋 Fetched owner information for ${owner.user.tag}`);

    // Use high-level guild initialization operation
    await db.guild.initialize({
      guildId,
      guildName: guild.name,
      ownerId,
      ownerData: {
        username: owner.user.username,
        discriminator: owner.user.discriminator,
        avatarUrl: owner.user.displayAvatarURL(),
      },
    });

    logger.info(`✅ Database setup completed for guild ${guild.name}`);

    logger.info(
      `✅ Completed all setup for guild ${guild.name} - owner ${owner.user.tag} now has admin permissions`
    );
  } catch (error) {
    logger.error(`❌ Failed to complete setup for guild ${guild.name}:`, error);
  }
});