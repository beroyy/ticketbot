import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { parseDiscordId } from "@ticketsbot/core";
import { Redis } from "@ticketsbot/core";

export const GuildDeleteListener = ListenerFactory.on("guildDelete", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Left guild: ${guild.name} (${guild.id})`);

  try {
    // Remove from bot guilds cache if Redis is available
    if (Redis.isAvailable()) {
      const guildId = parseDiscordId(guild.id);
      await Redis.withRetry(
        async (client) => client.sRem("bot:guilds", guildId),
        `guildDelete.removeFromCache(${guildId})`
      );
      logger.info(`✅ Removed guild ${guild.name} from bot guilds cache`);
    }

    // Log the removal
    logger.info(
      `✅ Completed cleanup for guild ${guild.name} - bot was removed or guild was deleted`
    );
  } catch (error) {
    logger.error(`❌ Failed to clean up after leaving guild ${guild.name}:`, error);
  }
});