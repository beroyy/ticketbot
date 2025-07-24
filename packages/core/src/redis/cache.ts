import { redisClient } from "./client";
import { logger } from "../utils/logger";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

/**
 * Unified caching interface that works with Redis when available,
 * or gracefully degrades to in-memory caching.
 */
export class Cache {
  private prefix: string;
  private defaultTtl: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  // Fallback in-memory cache when Redis is unavailable
  private memoryCache = new Map<string, { value: string; expires: number }>();

  constructor(options: CacheOptions = {}) {
    this.prefix = options.prefix || "cache";
    this.defaultTtl = options.ttl || 300; // 5 minutes default
  }

  /**
   * Build a cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);

    try {
      // Try Redis first
      const value = await redisClient.withRetry(
        async (client) => client.get(fullKey),
        `cache.get(${key})`
      );

      if (value !== null) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      logger.warn(`[Cache] Redis get failed for ${key}, checking memory cache`, error);

      // Fallback to memory cache
      const cached = this.memoryCache.get(fullKey);
      if (cached && cached.expires > Date.now()) {
        this.stats.hits++;
        return JSON.parse(cached.value) as T;
      }

      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttlSeconds = ttl || this.defaultTtl;
    const serialized = JSON.stringify(value);

    try {
      await redisClient.withRetry(
        async (client) => client.setEx(fullKey, ttlSeconds, serialized),
        `cache.set(${key})`
      );
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      logger.warn(`[Cache] Redis set failed for ${key}, using memory cache`, error);

      // Fallback to memory cache
      this.memoryCache.set(fullKey, {
        value: serialized,
        expires: Date.now() + ttlSeconds * 1000,
      });
      this.stats.sets++;

      // Clean up expired entries periodically
      this.cleanupMemoryCache();
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);

    try {
      await redisClient.withRetry(async (client) => client.del(fullKey), `cache.delete(${key})`);
      this.stats.deletes++;
    } catch (error) {
      this.stats.errors++;
      logger.warn(`[Cache] Redis delete failed for ${key}`, error);
    }

    // Always delete from memory cache too
    this.memoryCache.delete(fullKey);
    this.stats.deletes++;
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.buildKey(pattern);

    try {
      await redisClient.withRetry(async (client) => {
        const keys = [];
        for await (const key of client.scanIterator({
          MATCH: fullPattern,
          COUNT: 100,
        })) {
          keys.push(key);
        }
        if (keys.length > 0) {
          await client.del(keys as any);
        }
        return keys.length;
      }, `cache.deletePattern(${pattern})`);
    } catch (error) {
      this.stats.errors++;
      logger.warn(`[Cache] Redis deletePattern failed for ${pattern}`, error);
    }

    // Memory cache pattern deletion
    const regex = new RegExp(`^${fullPattern.replace("*", ".*")}$`);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        this.stats.deletes++;
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[Cache] Cleaned up ${cleaned} expired memory cache entries`);
    }
  }
}

// Pre-configured cache instances
export const caches = {
  permissions: new Cache({ prefix: "perms", ttl: 300 }), // 5 minutes
  guilds: new Cache({ prefix: "guilds", ttl: 600 }), // 10 minutes
  users: new Cache({ prefix: "users", ttl: 300 }), // 5 minutes
  sessions: new Cache({ prefix: "sessions", ttl: 3600 }), // 1 hour
  general: new Cache({ prefix: "general", ttl: 300 }), // 5 minutes
};
