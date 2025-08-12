// Shared utilities and constants

export interface BotConfig {
  discordToken: string;
  clientId: string;
  databaseUrl: string;
  environment: "development" | "production";
}

export interface TicketEmbedOptions {
  title?: string;
  description?: string;
  color?: number;
  footer?: string;
  timestamp?: boolean;
}

// Utility functions
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString()}h ${minutes.toString()}m ${remainingSeconds.toString()}s`;
  } else if (minutes > 0) {
    return `${minutes.toString()}m ${remainingSeconds.toString()}s`;
  } else {
    return `${remainingSeconds.toString()}s`;
  }
}

export function parseDiscordId(id: string): string {
  // Validate that the ID is numeric
  if (!/^\d+$/.test(id)) {
    throw new Error(`Invalid Discord ID format: "${id}". Discord IDs must be numeric.`);
  }
  return id;
}

export function formatDiscordId(id: string): string {
  return id;
}

export function createTicketThreadName(ticketId: number, username: string): string {
  return `Ticket #${ticketId.toString()} - ${username}`;
}

export function validateEnvironmentVariables(config: Partial<BotConfig>): BotConfig {
  const required = ["discordToken", "clientId", "databaseUrl"];
  const missing = required.filter((key) => !config[key as keyof BotConfig]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return config as BotConfig;
}

// Export logger utilities
export { logger, createLogger, type LogLevel } from "./logger";
