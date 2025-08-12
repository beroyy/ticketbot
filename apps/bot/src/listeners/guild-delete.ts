import { ListenerFactory } from "@bot/lib/sapphire";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { parseDiscordId } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";

export const GuildDeleteListener = ListenerFactory.on("guildDelete", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Left guild: ${guild.name} (${guild.id})`);

  try {
    const guildId = parseDiscordId(guild.id);
    await db.guild.updateGuild(guildId, { botInstalled: false });

    logger.info(`✅ Updated guild ${guild.name} with botInstalled = false`);

    logger.info(
      `✅ Completed cleanup for guild ${guild.name} - bot was removed or guild was deleted`
    );
  } catch (error) {
    logger.error(`❌ Failed to clean up after leaving guild ${guild.name}:`, error);
  }
});
