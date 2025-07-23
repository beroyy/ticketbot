import { EventEmitter } from "events";
import { Redis } from "../../redis";

/**
 * Redis-backed cache with TTL support and fallback to in-memory.
 * Implements the same interface as CacheService for drop-in replacement.
 */
export class RedisCacheService extends EventEmitter {
  // Fallback in-memory cache when Redis is unavailable
  private memoryCache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get a value from the cache
   */
  async get(key: string): Promise<unknown> {
    try {
      // Try Redis first
      const value = await Redis.caches.permissions.get(key);
      
      if (value !== null) {
        this.emit("hit", key);
        return value;
      }

      this.emit("miss", key);
      return null;
    } catch (error) {
      // Fallback to memory cache
      return this.getFromMemory(key);
    }
  }

  /**
   * Synchronous get for backward compatibility
   */
  getSync(key: string): unknown {
    // For sync operations, use memory cache
    return this.getFromMemory(key);
  }

  /**
   * Set a value in the cache with TTL
   */
  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    try {
      await Redis.caches.permissions.set(key, value, ttlSeconds);
      this.emit("set", key, value, ttlMs);
      
      // Also set in memory cache for sync operations
      this.setInMemory(key, value, ttlMs);
    } catch (error) {
      // Fallback to memory cache
      this.setInMemory(key, value, ttlMs);
    }
  }

  /**
   * Synchronous set for backward compatibility
   */
  setSync(key: string, value: unknown, ttlMs: number): void {
    // For sync operations, use memory cache and async Redis
    this.setInMemory(key, value, ttlMs);
    
    // Fire and forget Redis update
    void this.set(key, value, ttlMs);
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;

    try {
      await Redis.caches.permissions.delete(key);
      deleted = true;
    } catch (error) {
      // Continue with memory cache deletion
    }

    // Always delete from memory cache too
    if (this.deleteFromMemory(key)) {
      deleted = true;
    }

    if (deleted) {
      this.emit("delete", key);
    }

    return deleted;
  }

  /**
   * Synchronous delete for backward compatibility
   */
  deleteSync(key: string): boolean {
    // Fire and forget Redis deletion
    void this.delete(key);
    
    return this.deleteFromMemory(key);
  }

  /**
   * Delete all entries matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    let count = 0;

    try {
      await Redis.caches.permissions.deletePattern(pattern);
      // We don't know exact count from Redis, estimate from memory cache
    } catch (error) {
      // Continue with memory cache
    }

    // Always clear from memory cache
    count += this.deletePatternFromMemory(pattern);

    return count;
  }

  /**
   * Synchronous deletePattern for backward compatibility
   */
  deletePatternSync(pattern: string): number {
    // Fire and forget Redis deletion
    void this.deletePattern(pattern);
    
    return this.deletePatternFromMemory(pattern);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Note: We don't clear all Redis keys (could affect other caches)
    // Instead, we rely on TTL expiration for Redis
    
    // Clear memory cache
    this.clearMemory();
    
    this.emit("clear", this.memoryCache.size);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
    redisStats?: any;
  } {
    const keys = Array.from(this.memoryCache.keys());
    const memoryUsage = keys.reduce((total, key) => {
      const entry = this.memoryCache.get(key);
      const valueSize = JSON.stringify(entry).length;
      return total + key.length + valueSize;
    }, 0);

    const stats: any = {
      size: this.memoryCache.size,
      keys,
      memoryUsage,
    };

    // Add Redis stats if available
    if (Redis.isAvailable()) {
      stats.redisStats = Redis.caches.permissions.getStats();
    }

    return stats;
  }

  // Memory cache helpers
  private getFromMemory(key: string): unknown {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      this.emit("miss", key);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.deleteFromMemory(key);
      this.emit("miss", key);
      return null;
    }

    this.emit("hit", key);
    return entry.value;
  }

  private setInMemory(key: string, value: unknown, ttlMs: number): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const expiresAt = Date.now() + ttlMs;
    this.memoryCache.set(key, { value, expiresAt });

    // Set auto-deletion timer
    const timer = setTimeout(() => {
      this.deleteFromMemory(key);
    }, ttlMs);
    this.timers.set(key, timer);
  }

  private deleteFromMemory(key: string): boolean {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    return this.memoryCache.delete(key);
  }

  private deletePatternFromMemory(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    const keysToDelete: string[] = [];

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.deleteFromMemory(key);
    }

    return keysToDelete.length;
  }

  private clearMemory(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.memoryCache.clear();
  }
}

// Create wrapper that maintains backward compatibility
export class CacheServiceWrapper extends EventEmitter {
  private redisCache: RedisCacheService;

  constructor() {
    super();
    this.redisCache = new RedisCacheService();
    
    // Forward events
    this.redisCache.on("hit", (key) => this.emit("hit", key));
    this.redisCache.on("miss", (key) => this.emit("miss", key));
    this.redisCache.on("set", (key, value, ttl) => this.emit("set", key, value, ttl));
    this.redisCache.on("delete", (key) => this.emit("delete", key));
    this.redisCache.on("clear", (size) => this.emit("clear", size));
  }

  // Synchronous methods for backward compatibility
  get(key: string): unknown {
    return this.redisCache.getSync(key);
  }

  set(key: string, value: unknown, ttlMs: number): void {
    this.redisCache.setSync(key, value, ttlMs);
  }

  delete(key: string): boolean {
    return this.redisCache.deleteSync(key);
  }

  deletePattern(pattern: string): number {
    return this.redisCache.deletePatternSync(pattern);
  }

  clear(): void {
    void this.redisCache.clear();
  }

  getStats() {
    return this.redisCache.getStats();
  }
}

// Export singleton instance that's backward compatible
export const cacheService = new CacheServiceWrapper();