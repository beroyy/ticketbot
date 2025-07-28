/**
 * Environment configuration for Next.js web app
 * Provides type-safe, validated environment variables
 */

import { z } from "zod";

// Custom stringbool type for parsing "true"/"false" strings to boolean
const stringbool = () => z.string().transform((val) => val === "true");

/**
 * Server-side environment schema
 * The web app is a pure frontend and doesn't need database or auth secrets
 * Only includes variables actually used by the web app
 */
const serverSchema = z.object({
  // Core configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // URLs for server-side API calls (if any)
  WEB_URL: z.url(),
  API_URL: z.url(),

  // Port for Next.js server
  WEB_PORT: z.coerce.number().positive().default(3000),

  // Web-specific (optional)
  NEXT_TELEMETRY_DISABLED: stringbool().optional(),
});

/**
 * Client-side environment schema
 * These variables are exposed to the browser with NEXT_PUBLIC_ prefix
 */
const clientSchema = z.object({
  // Public API URL - should match server API_URL
  NEXT_PUBLIC_API_URL: z.url(),

  // Discord OAuth (optional in client)
  NEXT_PUBLIC_DISCORD_CLIENT_ID: z.string().optional(),

  // Feature flags
  NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: stringbool().default(false).optional(),
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS: stringbool().default(false).optional(),
  NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: stringbool().default(false).optional(),

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
      NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: process.env.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI,
      NEXT_PUBLIC_FEATURE_BULK_ACTIONS: process.env.NEXT_PUBLIC_FEATURE_BULK_ACTIONS,
      NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_FORMS,
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
    // During build phase, Next.js may not have all env vars available
    // Check if we're in the build phase
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

    if (isBuildPhase) {
      // During build, provide defaults for server vars that aren't critical during build
      console.warn("Build phase detected - using defaults for missing env vars");

      const server: z.infer<typeof serverSchema> = {
        NODE_ENV: (process.env.NODE_ENV as any) || "production",
        WEB_URL: process.env.WEB_URL || "http://localhost:3000",
        API_URL: process.env.API_URL || "http://localhost:3001",
        WEB_PORT: Number(process.env.WEB_PORT) || 3000,
        NEXT_TELEMETRY_DISABLED:
          process.env.NEXT_TELEMETRY_DISABLED === "true"
            ? true
            : process.env.NEXT_TELEMETRY_DISABLED === "false"
              ? false
              : undefined,
      };

      // For client vars during build, provide defaults
      const clientEnv = {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
        NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
        NEXT_PUBLIC_GUILD_ID: process.env.NEXT_PUBLIC_GUILD_ID,
        NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: process.env.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI,
        NEXT_PUBLIC_FEATURE_BULK_ACTIONS: process.env.NEXT_PUBLIC_FEATURE_BULK_ACTIONS,
        NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_FORMS,
      };
      const client = clientSchema.parse(clientEnv);
      return { server, client };
    }

    // Server: Parse environment variables since .env is already loaded by Next.js
    const server = serverSchema.parse(process.env);
    const client = clientSchema.parse(process.env);

    return { server, client };
  }

  // Client-side validation (only validate client vars)
  // Use browser-safe validation with explicit values
  const clientEnv = getClientEnv();
  const client = clientSchema.parse(clientEnv);
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
    return env.client.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  }
  // Server: use internal API URL
  return env.server.API_URL;
};
