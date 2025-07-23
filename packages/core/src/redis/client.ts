import { createClient, type RedisClientType } from "redis";
import { existsSync } from "fs";
import { logger } from "../utils/logger";

export interface RedisHealthCheck {
  connected: boolean;
  latency?: number;
  error?: string;
}

/**
 * Centralized Redis client management for the entire monorepo.
 * Provides a single connection pool used by all services.
 */
class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private readonly maxReconnectAttempts = 5;

  /**
   * Initialize Redis connection with optimal pooling
   */
  async connect(): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Already connected
    if (this.isConnected && this.client) {
      return;
    }

    this.connectionPromise = this.performConnection();
    return this.connectionPromise;
  }

  private async performConnection(): Promise<void> {
    const redisUrl = this.getRedisUrl();
    if (!redisUrl) {
      logger.debug("[Redis] No REDIS_URL configured, Redis features disabled");
      return;
    }

    try {
      this.client = createClient({
        url: redisUrl,
        name: "ticketsbot-main",
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              logger.error(`[Redis] Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
              return new Error("Max reconnection attempts reached");
            }
            const delay = Math.min(retries * 1000, 5000);
            logger.debug(`[Redis] Reconnecting attempt ${retries}, delay: ${delay}ms`);
            return delay;
          },
          connectTimeout: 5000,
        },
      });

      // Set up event handlers
      this.client.on("error", (err) => {
        logger.error("[Redis] Client error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        logger.debug("[Redis] Connected");
        this.isConnected = true;
      });

      this.client.on("ready", () => {
        logger.info("[Redis] Ready for commands");
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error("[Redis] Failed to connect:", error);
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Get Redis URL with Docker environment detection
   */
  private getRedisUrl(): string | undefined {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return undefined;

    // Check if we're in Docker
    const isInDocker = existsSync("/.dockerenv") || existsSync("/run/.containerenv");

    if (isInDocker && redisUrl.includes("localhost")) {
      // In Docker, Redis always runs on port 6379 internally
      const url = new URL(redisUrl);
      url.hostname = "redis";
      url.port = "6379";
      const dockerUrl = url.toString();
      logger.debug(`[Redis] Docker detected - using ${dockerUrl} instead of ${redisUrl}`);
      return dockerUrl;
    }

    return redisUrl;
  }

  /**
   * Get the Redis client instance
   */
  async getClient(): Promise<RedisClientType | null> {
    if (!process.env.REDIS_URL) return null;

    if (!this.isConnected || !this.client) {
      try {
        await this.connect();
      } catch (_error) {
        logger.warn("[Redis] Connection failed, features will be disabled");
        return null;
      }
    }

    return this.client;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<RedisHealthCheck> {
    if (!this.isAvailable()) {
      return {
        connected: false,
        error: "Redis not connected",
      };
    }

    try {
      const client = await this.getClient();
      if (!client) {
        return {
          connected: false,
          error: "Redis client not available",
        };
      }

      const start = Date.now();
      await client.ping();
      const latency = Date.now() - start;

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Gracefully disconnect
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Execute operation with automatic retry
   */
  async withRetry<T>(
    operation: (client: RedisClientType) => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T | null> {
    const client = await this.getClient();
    if (!client) return null;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation(client);
      } catch (error) {
        lastError = error as Error;
        logger.error(`[Redis] ${operationName} error (attempt ${attempt + 1}):`, error);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000)));
        }
      }
    }

    logger.error(`[Redis] ${operationName} failed after ${maxRetries} retries`, lastError);
    throw lastError || new Error(`${operationName} failed`);
  }
}

// Singleton instance
export const redisClient = new RedisClient();