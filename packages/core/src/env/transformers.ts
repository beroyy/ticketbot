/**
 * Environment variable transformers
 * 
 * Simplified transformers that provide smart defaults without complex derivation.
 * URLs must be explicitly provided for multi-platform deployments.
 */

import type { NodeEnv } from "./schemas/env";

/**
 * Environment configuration
 */
export interface EnvConfig {
  // Core (required)
  NODE_ENV: NodeEnv;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  
  // Discord (required)
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  
  // URLs (required)
  WEB_URL: string;
  API_URL: string;
  NEXT_PUBLIC_API_URL: string;
  
  // Redis (optional)
  REDIS_URL?: string;
  
  // Ports (optional - have defaults)
  WEB_PORT?: string | number;
  API_PORT?: string | number;
  BOT_PORT?: string | number;
  
  // Logging (optional - smart defaults based on NODE_ENV)
  LOG_LEVEL?: string;
  LOG_REQUESTS?: string | boolean;
  
  // Additional configuration (optional)
  ALLOWED_ORIGINS?: string;
  COOKIE_DOMAIN?: string;
  RATE_LIMIT_ENABLED?: string | boolean;
  
  // Feature flags
  NEXT_PUBLIC_FEATURE_NEW_TICKET_UI?: boolean;
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS?: boolean;
  NEXT_PUBLIC_FEATURE_ADVANCED_FORMS?: boolean;
  NEXT_PUBLIC_GUILD_ID?: string;
  
  // Development helpers
  DEV_PERMISSIONS_HEX?: string;
  DEV_GUILD_ID?: string;
  DEV_DB_AUTO_SEED?: boolean;
  
  // Runtime helpers
  RUNNING_IN_DOCKER?: string;
  API_HOST?: string;
  API_SECRET?: string;
  
  // Legacy support (will be removed)
  TURBO_ENV?: "dev" | "staging" | "prod";
}

/**
 * Complete environment configuration with all values resolved
 */
export interface CompleteEnvConfig extends Required<Omit<EnvConfig, 'REDIS_URL' | 'DEV_PERMISSIONS_HEX' | 'DEV_GUILD_ID' | 'DEV_DB_AUTO_SEED' | 'NEXT_PUBLIC_GUILD_ID' | 'RATE_LIMIT_ENABLED' | 'COOKIE_DOMAIN' | 'ALLOWED_ORIGINS' | 'RUNNING_IN_DOCKER' | 'API_HOST' | 'API_SECRET'>> {
  // Ports are always numbers
  WEB_PORT: number;
  API_PORT: number;
  BOT_PORT: number;
  
  // Booleans are resolved
  LOG_REQUESTS: boolean;
  NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: boolean;
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS: boolean;
  NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: boolean;
  
  // Optional fields remain optional
  REDIS_URL?: string;
  COOKIE_DOMAIN?: string;
  RATE_LIMIT_ENABLED?: boolean;
  ALLOWED_ORIGINS?: string;
  DEV_PERMISSIONS_HEX?: string;
  DEV_GUILD_ID?: string;
  DEV_DB_AUTO_SEED?: boolean;
  NEXT_PUBLIC_GUILD_ID?: string;
  RUNNING_IN_DOCKER?: string;
  API_HOST?: string;
  API_SECRET?: string;
}

/**
 * Check if running in development
 */
const isDevelopment = (nodeEnv: NodeEnv): boolean => {
  return nodeEnv === "development";
};

/**
 * Check if running in production
 */
const isProduction = (nodeEnv: NodeEnv): boolean => {
  return nodeEnv === "production";
};

/**
 * Map NODE_ENV to legacy TURBO_ENV for backward compatibility
 */
const deriveTurboEnv = (nodeEnv: NodeEnv): "dev" | "staging" | "prod" => {
  switch (nodeEnv) {
    case "development":
      return "dev";
    case "production":
      return "prod";
    default:
      return "dev";
  }
};

/**
 * Transform environment configuration with smart defaults
 */
export function transformEnv(env: EnvConfig): CompleteEnvConfig {
  const isDev = isDevelopment(env.NODE_ENV);
  const isProd = isProduction(env.NODE_ENV);
  
  // Parse boolean values
  const logRequests = env.LOG_REQUESTS === undefined 
    ? !isProd 
    : (typeof env.LOG_REQUESTS === 'boolean' ? env.LOG_REQUESTS : env.LOG_REQUESTS === 'true');
    
  const rateLimitEnabled = env.RATE_LIMIT_ENABLED === undefined
    ? isProd
    : (typeof env.RATE_LIMIT_ENABLED === 'boolean' ? env.RATE_LIMIT_ENABLED : env.RATE_LIMIT_ENABLED === 'true');
  
  return {
    // Pass through required values
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: env.DATABASE_URL,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    DISCORD_TOKEN: env.DISCORD_TOKEN,
    DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: env.DISCORD_CLIENT_SECRET,
    
    // Pass through required URLs
    WEB_URL: env.WEB_URL,
    API_URL: env.API_URL,
    NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
    
    // Use explicit ports or defaults
    WEB_PORT: Number(env.WEB_PORT) || 3000,
    API_PORT: Number(env.API_PORT) || 3001,
    BOT_PORT: Number(env.BOT_PORT) || 3002,
    
    // Smart defaults based on environment
    LOG_LEVEL: env.LOG_LEVEL || (isDev ? "debug" : "warn"),
    LOG_REQUESTS: logRequests,
    
    // Optional pass-throughs
    REDIS_URL: env.REDIS_URL,
    COOKIE_DOMAIN: env.COOKIE_DOMAIN,
    RATE_LIMIT_ENABLED: rateLimitEnabled,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    
    // Feature flags (default to false)
    NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: env.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI ?? false,
    NEXT_PUBLIC_FEATURE_BULK_ACTIONS: env.NEXT_PUBLIC_FEATURE_BULK_ACTIONS ?? false,
    NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: env.NEXT_PUBLIC_FEATURE_ADVANCED_FORMS ?? false,
    NEXT_PUBLIC_GUILD_ID: env.NEXT_PUBLIC_GUILD_ID,
    
    // Development helpers
    DEV_PERMISSIONS_HEX: env.DEV_PERMISSIONS_HEX,
    DEV_GUILD_ID: env.DEV_GUILD_ID,
    DEV_DB_AUTO_SEED: env.DEV_DB_AUTO_SEED,
    
    // Runtime helpers
    RUNNING_IN_DOCKER: env.RUNNING_IN_DOCKER,
    API_HOST: env.API_HOST,
    API_SECRET: env.API_SECRET,
    
    // Legacy support
    TURBO_ENV: deriveTurboEnv(env.NODE_ENV),
  };
}

/**
 * Get environment summary for logging
 */
export function getEnvironmentSummary(env: CompleteEnvConfig): string {
  return `
Environment: ${env.NODE_ENV}
URLs:
  - Web: ${env.WEB_URL}
  - API: ${env.API_URL}
Ports:
  - Web: ${env.WEB_PORT}
  - API: ${env.API_PORT}
  - Bot: ${env.BOT_PORT}
Services:
  - Redis: ${env.REDIS_URL ? 'Connected' : 'Not configured'}
`.trim();
}

/**
 * Helper functions for environment checks
 */
export const isDevEnvironment = () => process.env.NODE_ENV === 'development';
export const isProdEnvironment = () => process.env.NODE_ENV === 'production';
export const isTestEnvironment = () => process.env.NODE_ENV === 'test';

// For backward compatibility
export { transformEnv as deriveEnvironment };
export type { EnvConfig as BaseEnvConfig };