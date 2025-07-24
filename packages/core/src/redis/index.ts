import { redisClient, type RedisHealthCheck } from "./client";
import { Cache, caches, type CacheOptions, type CacheStats } from "./cache";
import type { RedisClientType } from "redis";

/**
 * Main Redis module providing centralized access to Redis functionality.
 * This replaces the scattered Redis usage across the codebase.
 */
export const Redis = {
  /**
   * Initialize Redis connection on startup
   */
  async initialize(): Promise<void> {
    if (!process.env.REDIS_URL) {
      console.log("[Redis] No REDIS_URL configured, Redis features will be disabled");
      return;
    }

    try {
      await redisClient.connect();
      console.log("[Redis] Successfully initialized");
    } catch (error) {
      console.error("[Redis] Failed to initialize:", error);
      // Don't throw - allow app to start without Redis
    }
  },

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return redisClient.isAvailable();
  },

  /**
   * Get Redis client for direct operations
   */
  async getClient(): Promise<RedisClientType | null> {
    return redisClient.getClient();
  },

  /**
   * Perform health check
   */
  async healthCheck(): Promise<RedisHealthCheck> {
    return redisClient.healthCheck();
  },

  /**
   * Execute operation with retry
   */
  async withRetry<T>(
    operation: (client: RedisClientType) => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    return redisClient.withRetry(operation, operationName);
  },

  /**
   * Gracefully shutdown Redis connections
   */
  async shutdown(): Promise<void> {
    await redisClient.disconnect();
  },

  /**
   * Pre-configured cache instances
   */
  caches,

  /**
   * Create a custom cache instance
   */
  createCache(options: CacheOptions): Cache {
    return new Cache(options);
  },
};

// Re-export types
export type { RedisHealthCheck, CacheOptions, CacheStats };
export { Cache };

// Backward compatibility exports
export function isRedisAvailable(): boolean {
  return Redis.isAvailable();
}

export async function getRedisConnection(): Promise<RedisClientType | null> {
  return Redis.getClient();
}
