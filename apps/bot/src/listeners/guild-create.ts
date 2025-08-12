import { ListenerFactory } from "@bot/lib/sapphire";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { db } from "@ticketsbot/db";

export const GuildCreateListener = ListenerFactory.on("guildCreate", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  try {
    const owner = await guild.fetchOwner();
    logger.info(`📋 Fetched owner information for ${owner.user.tag}`);

    await db.guild.initialize({
      guildId: guild.id,
      guildName: guild.name,
      ownerId: guild.ownerId,
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
