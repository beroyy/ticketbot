import { loadEnv, createAppEnvLoader, z } from "@ticketsbot/core/env";

// Bot-specific environment overrides (all optional)
const BotSpecificSchema = z.object({
  // Bot-specific flags
  SKIP_DB_INIT: z.stringbool().optional(),
  
  // Discord bot settings
  DISCORD_BOT_PREFIX: z.string().max(5).default("!").optional(),
  DISCORD_BOT_STATUS: z.string().max(128).optional(),
});

// Create bot environment loader
const loadBotEnv = createAppEnvLoader(BotSpecificSchema);

export const env = loadBotEnv();

if (env.RUNNING_IN_DOCKER) {
  console.log("🐳 [Bot] Running in Docker - using environment variables from container");
} else {
  console.log("📁 [Bot] Environment variables loaded and validated");
}

console.log({
  environment: env.NODE_ENV,
  port: env.BOT_PORT,
  clientId: env.DISCORD_CLIENT_ID,
  redis: env.REDIS_URL ? "configured" : "not configured",
  docker: env.RUNNING_IN_DOCKER,
  status: env.DISCORD_BOT_STATUS || "default",
});

export const botConfig = {
  discordToken: env.DISCORD_TOKEN,
  clientId: env.DISCORD_CLIENT_ID,
  databaseUrl: env.DATABASE_URL,
  environment: env.NODE_ENV,
};

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isDocker = () => env.RUNNING_IN_DOCKER;
