/**
 * Service-specific environment configuration schemas
 */

import { z } from "zod";

// Discord configuration schema
export const DiscordEnvSchema = z.object({
  // Bot token
  DISCORD_TOKEN: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9_.-]+$/, "Invalid Discord token format"),

  // OAuth credentials
  DISCORD_CLIENT_ID: z.string().regex(/^\d{17,20}$/, "Must be a valid Discord application ID"),

  DISCORD_CLIENT_SECRET: z
    .string()
    .min(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid Discord client secret format"),

  // OAuth redirect
  DISCORD_REDIRECT_URI: z.url().optional(),

  // Bot settings
  DISCORD_BOT_PREFIX: z.string().max(5).default("!").optional(),
  DISCORD_BOT_STATUS: z.string().max(128).optional(),
});

// Authentication configuration schema
export const AuthEnvSchema = z.object({
  // Better Auth secret
  BETTER_AUTH_SECRET: z.string().min(32, "Auth secret must be at least 32 characters"),

  // Session settings
  SESSION_MAX_AGE: z.number().int().min(3600).default(604800).optional(), // 7 days default
  SESSION_UPDATE_AGE: z.number().int().min(60).default(86400).optional(), // 1 day default

  // Cookie settings
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.boolean().default(true).optional(),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax").optional(),
});

// External services schema
export const ExternalServicesEnvSchema = z.object({
  // OpenAI (optional)
  OPENAI_API_KEY: z
    .string()
    .regex(/^sk-[A-Za-z0-9]+$/, "Invalid OpenAI API key format")
    .optional(),

  // Sentry (optional)
  SENTRY_DSN: z.url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // PostHog (optional)
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.url().optional(),
});

// Combine all service schemas
export const ServicesEnvSchema = z.object({
  ...DiscordEnvSchema.shape,
  ...AuthEnvSchema.shape,
  ...ExternalServicesEnvSchema.shape,
});

export type ServicesEnv = z.infer<typeof ServicesEnvSchema>;
