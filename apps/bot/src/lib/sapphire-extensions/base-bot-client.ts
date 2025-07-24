import { SapphireClient, LogLevel } from "@sapphire/framework";
import type { ClientOptions } from "discord.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

/**
 * Get directory name from import.meta.url
 */
export function getDirname(importMetaUrl: string): string {
  const filename = fileURLToPath(importMetaUrl);
  return dirname(filename);
}

/**
 * Configuration options for BaseBotClient
 */
export interface BaseBotClientOptions {
  /**
   * Bot-specific initialization function
   */
  onInitialize?: () => Promise<void> | void;

  /**
   * Bot-specific cleanup function
   */
  onDestroy?: () => Promise<void> | void;

  /**
   * Override the base user directory
   * If not provided, will use the calling file's parent directory
   */
  baseUserDirectory?: string;
}

/**
 * Base client class for Discord bots using Sapphire Framework
 * Provides common configuration and hooks for initialization
 */
export class BaseBotClient extends SapphireClient {
  private onInitialize?: () => Promise<void> | void;
  private onDestroy?: () => Promise<void> | void;

  public constructor(options: BaseBotClientOptions & ClientOptions) {
    const { onInitialize, onDestroy, baseUserDirectory, ...clientOptions } = options;

    super({
      loadMessageCommandListeners: false, // Default to slash commands only
      logger: {
        level: (() => {
          // Map LOG_LEVEL env var to Sapphire LogLevel
          switch (process.env.LOG_LEVEL) {
            case "debug":
              return LogLevel.Debug;
            case "info":
              return LogLevel.Info;
            case "warn":
              return LogLevel.Warn;
            case "error":
              return LogLevel.Error;
            default:
              // Default to Info for development, Warn for production
              return process.env.NODE_ENV === "development" ? LogLevel.Info : LogLevel.Warn;
          }
        })(),
      },
      baseUserDirectory: baseUserDirectory || process.cwd(),
      ...clientOptions,
    });

    this.onInitialize = onInitialize;
    this.onDestroy = onDestroy;
  }

  /**
   * Override login to run initialization
   */
  public override async login(token?: string): Promise<string> {
    // Run bot-specific initialization
    if (this.onInitialize) {
      await this.onInitialize();
    }

    // Continue with normal login
    return super.login(token);
  }

  /**
   * Override destroy to run cleanup
   */
  public override async destroy(): Promise<void> {
    // Run bot-specific cleanup
    if (this.onDestroy) {
      await this.onDestroy();
    }

    // Continue with normal destroy
    return super.destroy();
  }
}

/**
 * Create a bot client with common configuration
 */
export function createBotClient(options: BaseBotClientOptions & ClientOptions): BaseBotClient {
  return new BaseBotClient(options);
}
