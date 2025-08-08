import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Client } from "discord.js";
import { isDevelopment } from "@bot/config";
import { ScheduledTask, syncBotInstallStatus } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";

export const ReadyListener = ListenerFactory.once("ready", async (client: Client<true>) => {
  const { logger } = container;

  logger.info(`✅ Ready! Logged in as ${client.user.tag}`);
  logger.info(`🎯 Serving ${client.guilds.cache.size} guilds`);
  logger.info(`📝 ${container.stores.get("commands").size} commands loaded`);
  logger.info(`👂 ${container.stores.get("listeners").size} listeners loaded`);


  // Initialize scheduled task system
  try {
    await ScheduledTask.initialize();
    logger.info("✅ Scheduled task system initialized");

    // Clean up any orphaned jobs from previous runs
    await ScheduledTask.cleanupOrphanedJobs();
  } catch (error) {
    logger.error("❌ Failed to initialize scheduled task system:", error);
  }

  // Set bot activity
  client.user.setActivity(`/help | ${client.guilds.cache.size} servers`, {
    type: 3, // ActivityType.Watching
  });

  // Sync bot installation status for all guilds
  try {
    const guildIds = client.guilds.cache.map((guild) => parseDiscordId(guild.id));
    await syncBotInstallStatus(guildIds);
    logger.info(`✅ Synced bot installation status for ${guildIds.length} guilds`);
  } catch (error) {
    logger.error("❌ Failed to sync bot installation status:", error);
  }

  if (isDevelopment()) {
    logger.warn("🔧 Running in development mode");
  }
});
