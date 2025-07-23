import { createClient, type RedisClientType } from "redis";
import { existsSync } from "fs";
import { logger } from "../utils/logger";

export interface RedisServiceConfig {
  url: string;
  maxRetries?: number;
  retryDelay?: number;
  connectionName?: string;
}

export interface RedisHealthCheck {
  connected: boolean;
  latency?: number;
  error?: string;
}

/**
 * Shared Redis service for centralized client management
 * Provides connection pooling, error handling, and health checks
 */
export class RedisService {
  private client: RedisClientType | null = null;
  private config: RedisServiceConfig;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor(config: RedisServiceConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Initialize Redis connection with retry logic
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
    try {
      this.client = createClient({
        url: this.config.url,
        ...(this.config.connectionName && { name: this.config.connectionName }),
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              logger.error(
                `Redis: Max reconnection attempts (${this.maxReconnectAttempts.toString()}) reached`
              );
              return new Error("Max reconnection attempts reached");
            }
            const delay = Math.min(retries * 1000, 5000);
            logger.debug(
              `Redis: Reconnecting attempt ${retries.toString()}, delay: ${delay.toString()}ms`
            );
            return delay;
          },
        },
      });

      // Set up event handlers
      this.client.on("error", (err) => {
        logger.error(`Redis ${this.config.connectionName || "default"} error:`, err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        logger.debug(`Redis ${this.config.connectionName || "default"} connected`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on("reconnecting", () => {
        logger.debug(`Redis ${this.config.connectionName || "default"} reconnecting...`);
        this.reconnectAttempts++;
      });

      this.client.on("ready", () => {
        logger.debug(`Redis ${this.config.connectionName || "default"} ready`);
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error(`Failed to connect to Redis ${this.config.connectionName || "default"}:`, error);
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Get the Redis client, ensuring it's connected
   */
  async getClient(): Promise<RedisClientType> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("Redis client not available");
    }

    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Perform health check on Redis connection
   */
  async healthCheck(): Promise<RedisHealthCheck> {
    if (!this.isReady()) {
      return {
        connected: false,
        error: "Redis not connected",
      };
    }

    try {
      const start = Date.now();
      const client = await this.getClient();
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
   * Gracefully disconnect from Redis
   */
  disconnect(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Execute a Redis operation with retry logic
   */
  async withRetry<T>(
    operation: (client: RedisClientType) => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (this.config.maxRetries || 3); attempt++) {
      try {
        const client = await this.getClient();
        return await operation(client);
      } catch (error) {
        lastError = error as Error;
        logger.error(`Redis ${operationName} error (attempt ${(attempt + 1).toString()}):`, error);

        if (attempt < (this.config.maxRetries || 3)) {
          await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay || 1000));
        }
      }
    }

    const errorMessage = `Redis ${operationName} failed after ${(this.config.maxRetries ?? 3).toString()} retries`;
    logger.error(errorMessage, lastError);
    throw new Error(`${errorMessage}: ${lastError?.message || "Unknown error"}`);
  }
}

// Singleton instance for the main Redis connection
let redisService: RedisService | null = null;

/**
 * Get or create the shared Redis service instance
 */
export function getRedisService(): RedisService | null {
  if (!process.env["REDIS_URL"]) {
    return null;
  }

  if (!redisService) {
    // Override Redis URL for Docker environment
    let redisUrl = process.env["REDIS_URL"];

    // Check if we can reach the Redis Docker service
    const isInDocker = existsSync("/.dockerenv") || existsSync("/run/.containerenv");

    if (isInDocker && redisUrl.includes("localhost")) {
      // In Docker, Redis always runs on port 6379 internally
      // The external port (4379, 5379, etc.) is only for host access
      const originalUrl = new URL(redisUrl);
      const originalPort = originalUrl.port;
      originalUrl.hostname = "redis";
      originalUrl.port = "6379"; // Internal Redis port in Docker
      redisUrl = originalUrl.toString();
      logger.debug(
        `[Redis] Docker environment detected - using ${redisUrl} (internal) instead of localhost:${originalPort} (external)`
      );
    }

    // Don't log the full URL as it may contain credentials
    const urlForLogging = new URL(redisUrl);
    logger.debug(
      "[Redis] Creating service with URL:",
      `redis://${urlForLogging.hostname}:${urlForLogging.port}`
    );
    redisService = new RedisService({
      url: redisUrl,
      connectionName: "ticketsbot-main",
    });
  }

  return redisService;
}

/**
 * Create a new Redis service instance with custom configuration
 * Useful for separate connections for different purposes
 */
export function createRedisService(config: RedisServiceConfig): RedisService {
  return new RedisService(config);
}
