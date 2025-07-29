import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Client } from "discord.js";
import { isDevelopment } from "@bot/config";
import { ScheduledTask } from "@ticketsbot/core/domains";
import { Redis } from "@ticketsbot/core";

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

  // Cache bot guild list in Redis
  if (Redis.isAvailable()) {
    try {
      const guildIds = client.guilds.cache.map((guild) => guild.id);
      if (guildIds.length > 0) {
        await Redis.withRetry(
          async (redis) => {
            // Clear and repopulate the set
            await redis.del("bot:guilds");
            await redis.sAdd("bot:guilds", guildIds);
          },
          "ready.cacheBotGuilds"
        );
        logger.info(`✅ Cached ${guildIds.length} guilds in Redis`);
      }
    } catch (error) {
      logger.error("❌ Failed to cache bot guilds:", error);
    }
  }

  if (isDevelopment()) {
    logger.warn("🔧 Running in development mode");
  }
});
