/**
 * Environment schema
 * 
 * This schema defines the required environment variables.
 * Additional values are automatically derived using transformers.
 */

import { z } from "zod";
import { NodeEnvSchema } from "./env";
import { PostgresUrlSchema, RedisUrlSchema } from "./database";

/**
 * Core environment schema with required and optional values
 */
export const EnvSchema = z.object({
  // Core (required)
  NODE_ENV: NodeEnvSchema,
  DATABASE_URL: PostgresUrlSchema,
  BETTER_AUTH_SECRET: z.string().min(32, "Auth secret must be at least 32 characters"),
  
  // Discord (required)
  DISCORD_TOKEN: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9_.-]+$/, "Invalid Discord token format"),
  DISCORD_CLIENT_ID: z.string().regex(/^\d{17,20}$/, "Must be a valid Discord application ID"),
  DISCORD_CLIENT_SECRET: z
    .string()
    .min(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid Discord client secret format"),
  
  // Base configuration (optional with smart defaults)
  BASE_DOMAIN: z.string().optional(),
  PORT_OFFSET: z.coerce.number().positive().default(3000).optional(),
  
  // Redis (optional)
  REDIS_URL: RedisUrlSchema.optional(),
  
  // Feature flags (all optional)
  NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: z.stringbool().default(false).optional(),
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS: z.stringbool().default(false).optional(),
  NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: z.stringbool().default(false).optional(),
  NEXT_PUBLIC_GUILD_ID: z.string().regex(/^\d{17,20}$/, "Must be a valid Discord guild ID").optional(),
  
  // Development helpers (optional)
  DEV_PERMISSIONS_HEX: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, "Must be a hex string starting with 0x")
    .optional(),
  DEV_GUILD_ID: z.string().regex(/^\d{17,20}$/, "Must be a valid Discord guild ID").optional(),
  DEV_DB_AUTO_SEED: z.stringbool().optional(),
  
  // Optional overrides (if you need to override derived values)
  WEB_URL: z.string().url().optional(),
  API_URL: z.string().url().optional(),
  WEB_PORT: z.coerce.number().positive().optional(),
  API_PORT: z.coerce.number().positive().optional(),
  BOT_PORT: z.coerce.number().positive().optional(),
  DISCORD_REDIRECT_URI: z.string().url().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  LOG_REQUESTS: z.stringbool().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  RATE_LIMIT_ENABLED: z.stringbool().optional(),
}).refine(
  (data) => {
    // In production, BASE_DOMAIN is required unless URLs are explicitly provided
    if (data.NODE_ENV === "production" && !data.BASE_DOMAIN) {
      if (!data.WEB_URL || !data.API_URL) {
        return false;
      }
    }
    return true;
  },
  {
    message: "BASE_DOMAIN is required in production unless WEB_URL and API_URL are explicitly provided",
  }
);

export type Env = z.infer<typeof EnvSchema>;

/**
 * Example .env file configuration
 */
export const ENV_EXAMPLE = `
# Core (required)
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/ticketsbot
BETTER_AUTH_SECRET=your-secret-must-be-at-least-32-characters-long

# Discord (required)
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=your-client-secret

# Optional - defaults shown
# PORT_OFFSET=3000                    # Base port for services
# BASE_DOMAIN=ticketsbot.dev          # Required for production
# REDIS_URL=redis://localhost:6379    # Optional caching

# Feature flags (optional)
# NEXT_PUBLIC_FEATURE_NEW_TICKET_UI=false
# NEXT_PUBLIC_FEATURE_BULK_ACTIONS=false
# NEXT_PUBLIC_FEATURE_ADVANCED_FORMS=false
`.trim();