/**
 * Pure environment validation schemas for TicketsBot
 * Contains only Zod schemas without Node.js-specific setup logic
 *
 * TODO: PRODUCTION UPGRADES NEEDED
 * - Add URL validation back using proper Zod v4 syntax
 * - Add email validation for notification settings
 * - Add stronger Discord ID validation (snowflake format)
 * - Add database connection string validation
 * - Add SSL/TLS validation for production URLs
 */

import { z } from "zod";

// Define environment types
export const EnvironmentSchema = z.enum(["dev", "staging", "prod"]);
export const NodeEnvSchema = z.enum(["development", "production"]);
export const LogLevelSchema = z.enum(["error", "warn", "info", "debug"]);

export type Environment = z.infer<typeof EnvironmentSchema>;
export type NodeEnv = z.infer<typeof NodeEnvSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;

// Default port configuration
export const DEFAULT_PORTS = {
  API: 3001,
  WEB: 3000,
  BOT: 3002,
} as const;

// Environment-specific URLs
export const ENVIRONMENT_URLS = {
  dev: {
    api: "http://localhost:3001",
    web: "http://localhost:3000",
  },
  staging: {
    api: "https://api-staging.ticketsbot.dev",
    web: "https://staging.ticketsbot.dev",
  },
  prod: {
    api: "https://api.ticketsbot.dev",
    web: "https://ticketsbot.dev",
  },
} as const;

// Core environment schema
export const EnvironmentConfigSchema = z
  .object({
    // Core environment
    NODE_ENV: NodeEnvSchema,
    TURBO_ENV: EnvironmentSchema,

    // Database
    DATABASE_URL: z.string().min(1), // TODO: Add PostgreSQL connection string validation

    // API Configuration
    API_PORT: z.number().int().positive().max(65535).default(DEFAULT_PORTS.API),
    API_HOST: z.string().min(1).default("localhost"),
    API_URL: z.string().optional(), // TODO: Add URL validation + HTTPS requirement for prod
    API_SECRET: z.string().min(32).optional(), // TODO: Enforce minimum secret length

    // Web Configuration
    WEB_PORT: z.number().int().positive().max(65535).default(DEFAULT_PORTS.WEB),
    WEB_URL: z.string().optional(), // TODO: Add URL validation + HTTPS requirement

    // Bot Configuration
    BOT_PORT: z.number().int().positive().max(65535).default(DEFAULT_PORTS.BOT).optional(),
    DISCORD_TOKEN: z.string().min(1).optional(), // TODO: Add Discord token format validation
    DISCORD_CLIENT_ID: z.string().optional(), // TODO: Add Discord snowflake validation
    DISCORD_CLIENT_SECRET: z.string().min(1).optional(), // TODO: Add Discord secret format validation

    // Optional Configuration
    LOG_LEVEL: LogLevelSchema.default("info"),
    LOG_REQUESTS: z
      .string()
      .default("false")
      .transform((val) => val === "true")
      .optional(),
    REDIS_URL: z
      .string()
      .regex(/^redis:\/\/.*/, "Must be a valid Redis URL starting with redis://")
      .optional(),
    COOKIE_DOMAIN: z
      .string()
      .regex(
        /^(\.|[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/,
        "Must be a valid domain (e.g., .example.com)"
      )
      .optional(), // Optional - defaults to current domain

    // Rate Limiting Configuration
    RATE_LIMIT_ENABLED: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    RATE_LIMIT_WINDOW: z.string().regex(/^\d+$/, "Must be a number").optional(),
    RATE_LIMIT_MAX: z.string().regex(/^\d+$/, "Must be a number").optional(),

    // Development Feature Flags
    DEV_PERMISSIONS_HEX: z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/, "Must be a hex string starting with 0x")
      .optional(),
    DEV_GUILD_ID: z.string().regex(/^\d+$/, "Must be a valid Discord guild ID").optional(),
  })
  .refine(
    (data) => {
      // Environment consistency validation
      if (data.TURBO_ENV === "dev" && data.NODE_ENV !== "development") {
        return false;
      }
      if (
        (data.TURBO_ENV === "staging" || data.TURBO_ENV === "prod") &&
        data.NODE_ENV !== "production"
      ) {
        return false;
      }
      return true;
    },
    {
      message: "NODE_ENV must match TURBO_ENV (dev=development, staging/prod=production)",
    }
  );

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
