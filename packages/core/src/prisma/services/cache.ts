// Import the Redis-backed cache implementation
import { cacheService as redisCacheService } from "./redis-cache";
import type { CacheServiceWrapper } from "./redis-cache";

// Re-export the Redis-backed cache service
export const cacheService = redisCacheService;

// Export the CacheService type for backward compatibility
export type CacheService = CacheServiceWrapper;

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
