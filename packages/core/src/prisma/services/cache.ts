import { EventEmitter } from "events";

/**
 * Simple in-memory cache with TTL support
 * Used for caching permissions and default roles to reduce database queries
 */
export class CacheService extends EventEmitter {
  private cache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get a value from the cache
   */
  get(key: string): unknown {
    const entry = this.cache.get(key);

    if (!entry) {
      this.emit("miss", key);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.emit("miss", key);
      return null;
    }

    this.emit("hit", key);
    return entry.value;
  }

  /**
   * Set a value in the cache with TTL
   */
  set(key: string, value: unknown, ttlMs: number): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });

    // Set auto-deletion timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlMs);
    this.timers.set(key, timer);

    this.emit("set", key, value, ttlMs);
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit("delete", key);
    }
    return deleted;
  }

  /**
   * Delete all entries matching a pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    const size = this.cache.size;
    this.cache.clear();

    this.emit("clear", size);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    const keys = Array.from(this.cache.keys());
    const memoryUsage = keys.reduce((total, key) => {
      const entry = this.cache.get(key);
      const valueSize = JSON.stringify(entry).length;
      return total + key.length + valueSize;
    }, 0);

    return {
      size: this.cache.size,
      keys,
      memoryUsage,
    };
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache key helpers
export const CacheKeys = {
  userPermissions: (guildId: string, userId: string) => `perms:${guildId}:${userId}`,

  defaultRoles: (guildId: string) => `default-roles:${guildId}`,

  userRoles: (guildId: string, userId: string) => `roles:${guildId}:${userId}`,

  guildOwner: (guildId: string, userId: string) => `guild:${guildId}:owner:${userId}`,

  guildPattern: (guildId: string) => `*:${guildId}:*`,

  userPattern: (userId: string) => `*:*:${userId}`,
};

// TTL configurations (with defaults)
export const CacheTTL = {
  permissions: parseInt(process.env["PERMISSION_CACHE_TTL"] || "300000"), // 5 minutes
  defaultRoles: parseInt(process.env["DEFAULT_ROLES_CACHE_TTL"] || "3600000"), // 1 hour
  userRoles: parseInt(process.env["USER_ROLES_CACHE_TTL"] || "300000"), // 5 minutes
  guildOwner: parseInt(process.env["GUILD_OWNER_CACHE_TTL"] || "300000"), // 5 minutes
};

// Simple cache metrics for monitoring
class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private clears = 0;

  constructor() {
    cacheService.on("hit", () => this.hits++);
    cacheService.on("miss", () => this.misses++);
    cacheService.on("set", () => this.sets++);
    cacheService.on("delete", () => this.deletes++);
    cacheService.on("clear", () => this.clears++);
  }

  getMetrics() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      clears: this.clears,
      hitRate: hitRate.toFixed(2) + "%",
      ...cacheService.getStats(),
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.clears = 0;
  }
}

export const cacheMetrics = new CacheMetrics();
