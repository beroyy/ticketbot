/**
 * Environment configuration for Next.js web app
 * Provides type-safe, validated environment variables
 */

import { validateEnvFromValues, z } from "@ticketsbot/core/env/client"; // Browser-safe imports only

/**
 * Server-side environment schema
 * These variables are only available server-side
 */
const serverSchema = z.object({
  // Core configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // URLs
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),

  // Ports (optional)
  WEB_PORT: z.string().optional().default("3000").transform(Number).pipe(z.number().positive()),

  // Database (for server-side operations)
  DATABASE_URL: z.string().url(),

  // Auth secrets (server-only)
  DISCORD_CLIENT_SECRET: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32),
  DISCORD_REDIRECT_URI: z.string().url(),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),
});

/**
 * Client-side environment schema
 * These variables are exposed to the browser with NEXT_PUBLIC_ prefix
 */
const clientSchema = z.object({
  // Public API URL - optional with default for client-side
  NEXT_PUBLIC_API_URL: z.string().url().optional().default("http://localhost:4001"),

  // Discord OAuth (optional in client, as it might not be exposed)
  NEXT_PUBLIC_DISCORD_CLIENT_ID: z.string().optional(),

  // Development helpers (optional)
  NEXT_PUBLIC_GUILD_ID: z.string().optional(),
});

/**
 * Get client environment values
 * In the browser, Next.js statically replaces process.env.NEXT_PUBLIC_* at build time
 */
const getClientEnv = () => {
  if (typeof window !== "undefined") {
    // In browser: use statically replaced values or empty object
    return {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      NEXT_PUBLIC_GUILD_ID: process.env.NEXT_PUBLIC_GUILD_ID,
    };
  }
  // On server: use process.env directly
  return process.env;
};

/**
 * Validate environment variables
 * Uses dynamic imports to avoid bundling Node.js modules for the browser
 */
const validateEnvironment = () => {
  // Server-side validation (only runs on server)
  if (typeof window === "undefined") {
    // Server: Use validateEnvFromValues since .env is already loaded by Next.js
    const server = validateEnvFromValues(serverSchema);
    const client = validateEnvFromValues(clientSchema);

    return { server, client };
  }

  // Client-side validation (only validate client vars)
  // Use browser-safe validation with explicit values
  const clientEnv = getClientEnv();
  const client = validateEnvFromValues(clientSchema, clientEnv);
  return { server: {} as z.infer<typeof serverSchema>, client };
};

// Export validated environment
export const env = validateEnvironment();

// Type exports
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

// Helper functions
export const isDevelopment = () => env.server.NODE_ENV === "development";
export const isProduction = () => env.server.NODE_ENV === "production";
export const isTest = () => env.server.NODE_ENV === "test";

/**
 * Get the API URL based on environment
 * Prefers client-side URL when available
 */
export const getApiUrl = () => {
  if (typeof window !== "undefined") {
    // Browser: use public API URL with fallback
    return env.client.NEXT_PUBLIC_API_URL || "http://localhost:4001";
  }
  // Server: use internal API URL
  return env.server.API_URL;
};
