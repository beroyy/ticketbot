import { Redis } from "../../redis";
import { logger } from "../utils/logger";

const GUILD_CACHE_TTL = 15 * 60; // 15 minutes
const USER_DATA_TTL = 5 * 60; // 5 minutes

interface CachedGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export class DiscordCache {
  /**
   * Get cached guild list for a user
   */
  static async getGuilds(userId: string): Promise<CachedGuild[] | null> {
    if (!Redis.isAvailable()) {
      return null;
    }

    try {
      const cached = await Redis.withRetry(async (client) => {
        return client.get(`discord:guilds:${userId}`);
      }, "discord-cache-get-guilds");

      if (cached) {
        logger.debug("Found cached guilds for user", { userId });
        return JSON.parse(cached) as CachedGuild[];
      }
    } catch (error) {
      logger.error("Failed to get cached guilds:", error);
    }

    return null;
  }

  /**
   * Cache guild list for a user
   */
  static async setGuilds(userId: string, guilds: CachedGuild[]): Promise<void> {
    if (!Redis.isAvailable()) {
      return;
    }

    try {
      await Redis.withRetry(async (client) => {
        await client.setEx(
          `discord:guilds:${userId}`,
          GUILD_CACHE_TTL,
          JSON.stringify(guilds)
        );
      }, "discord-cache-set-guilds");

      logger.debug("Cached guilds for user", { userId, count: guilds.length });
    } catch (error) {
      logger.error("Failed to cache guilds:", error);
    }
  }

  /**
   * Invalidate guild cache for a user
   */
  static async invalidateGuilds(userId: string): Promise<void> {
    if (!Redis.isAvailable()) {
      return;
    }

    try {
      await Redis.withRetry(async (client) => {
        await client.del(`discord:guilds:${userId}`);
      }, "discord-cache-invalidate-guilds");

      logger.debug("Invalidated guild cache for user", { userId });
    } catch (error) {
      logger.error("Failed to invalidate guild cache:", error);
    }
  }

  /**
   * Get cached Discord user data
   */
  static async getUserData(discordId: string): Promise<any | null> {
    if (!Redis.isAvailable()) {
      return null;
    }

    try {
      const cached = await Redis.withRetry(async (client) => {
        return client.get(`discord:user:${discordId}`);
      }, "discord-cache-get-user");

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.error("Failed to get cached user data:", error);
    }

    return null;
  }

  /**
   * Cache Discord user data
   */
  static async setUserData(discordId: string, data: any): Promise<void> {
    if (!Redis.isAvailable()) {
      return;
    }

    try {
      await Redis.withRetry(async (client) => {
        await client.setEx(
          `discord:user:${discordId}`,
          USER_DATA_TTL,
          JSON.stringify(data)
        );
      }, "discord-cache-set-user");
    } catch (error) {
      logger.error("Failed to cache user data:", error);
    }
  }
}