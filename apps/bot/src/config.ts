import { loadAndValidateEnv, z } from "@ticketsbot/core/env";

const BotConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional().default("info"),
  RUNNING_IN_DOCKER: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true"),

  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  BOT_PORT: z.string().optional().default("3002").transform(Number).pipe(z.number().positive()),

  SKIP_DB_INIT: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export const env = loadAndValidateEnv(BotConfigSchema);

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
