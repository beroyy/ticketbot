/**
 * Environment variable transformers
 * 
 * These functions derive complete environment configurations from minimal inputs,
 * reducing the number of environment variables that need to be explicitly set.
 */

import type { NodeEnv } from "./schemas/env";

/**
 * Base environment configuration with only required values
 */
export interface BaseEnvConfig {
  NODE_ENV: NodeEnv;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  
  // Discord
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  
  // Optional base configuration
  BASE_DOMAIN?: string;
  PORT_OFFSET?: number;
  REDIS_URL?: string;
  
  // Feature flags
  NEXT_PUBLIC_FEATURE_NEW_TICKET_UI?: boolean;
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS?: boolean;
  NEXT_PUBLIC_FEATURE_ADVANCED_FORMS?: boolean;
  NEXT_PUBLIC_GUILD_ID?: string;
  
  // Development helpers
  DEV_PERMISSIONS_HEX?: string;
  DEV_GUILD_ID?: string;
  DEV_DB_AUTO_SEED?: boolean;
  
  // Optional overrides (if provided, skip derivation)
  WEB_URL?: string;
  API_URL?: string;
  WEB_PORT?: string | number;
  API_PORT?: string | number;
  BOT_PORT?: string | number;
  DISCORD_REDIRECT_URI?: string;
  LOG_LEVEL?: string;
  LOG_REQUESTS?: string | boolean;
  COOKIE_DOMAIN?: string;
  RATE_LIMIT_ENABLED?: string | boolean;
}

/**
 * Complete environment configuration with all derived values
 */
export interface CompleteEnvConfig extends Required<Omit<BaseEnvConfig, 'REDIS_URL' | 'DEV_PERMISSIONS_HEX' | 'DEV_GUILD_ID' | 'DEV_DB_AUTO_SEED' | 'NEXT_PUBLIC_GUILD_ID' | 'RATE_LIMIT_ENABLED' | 'COOKIE_DOMAIN'>> {
  // URLs are always strings
  WEB_URL: string;
  API_URL: string;
  NEXT_PUBLIC_API_URL: string;
  DISCORD_REDIRECT_URI: string;
  
  // Ports are always numbers
  WEB_PORT: number;
  API_PORT: number;
  BOT_PORT: number;
  
  // Optional fields remain optional
  REDIS_URL?: string;
  COOKIE_DOMAIN?: string;
  LOG_LEVEL: string;
  LOG_REQUESTS: boolean;
  RATE_LIMIT_ENABLED?: boolean;
  
  // Feature flags
  NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: boolean;
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS: boolean;
  NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: boolean;
  
  // Development
  DEV_PERMISSIONS_HEX?: string;
  DEV_GUILD_ID?: string;
  DEV_DB_AUTO_SEED?: boolean;
  NEXT_PUBLIC_GUILD_ID?: string;
  
  // Runtime helpers
  RUNNING_IN_DOCKER?: string;
  API_HOST?: string;
  API_SECRET?: string;
  
  // Legacy support (will be removed)
  TURBO_ENV?: "dev" | "staging" | "prod";
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
 * Derive complete environment configuration from minimal inputs
 */
export function deriveEnvironment(base: BaseEnvConfig): CompleteEnvConfig {
  const isDev = isDevelopment(base.NODE_ENV);
  const isProd = isProduction(base.NODE_ENV);
  const portOffset = Number(base.PORT_OFFSET) || 3000;
  
  // Derive base URLs
  const webUrl = base.WEB_URL || (
    isDev 
      ? `http://localhost:${portOffset}` 
      : `https://${base.BASE_DOMAIN || 'ticketsbot.dev'}`
  );
  
  const apiUrl = base.API_URL || (
    isDev 
      ? `http://localhost:${portOffset + 1}` 
      : `https://${base.BASE_DOMAIN || 'ticketsbot.dev'}`
  );
  
  // Ensure ports are numbers
  const webPort = Number(base.WEB_PORT) || portOffset;
  const apiPort = Number(base.API_PORT) || (portOffset + 1);
  const botPort = Number(base.BOT_PORT) || (portOffset + 2);
  
  // Parse boolean values
  const logRequests = base.LOG_REQUESTS === undefined 
    ? !isProd 
    : (typeof base.LOG_REQUESTS === 'boolean' ? base.LOG_REQUESTS : base.LOG_REQUESTS === 'true');
    
  const rateLimitEnabled = base.RATE_LIMIT_ENABLED === undefined
    ? isProd
    : (typeof base.RATE_LIMIT_ENABLED === 'boolean' ? base.RATE_LIMIT_ENABLED : base.RATE_LIMIT_ENABLED === 'true');
  
  return {
    // Pass through required values
    NODE_ENV: base.NODE_ENV,
    DATABASE_URL: base.DATABASE_URL,
    BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET,
    DISCORD_TOKEN: base.DISCORD_TOKEN,
    DISCORD_CLIENT_ID: base.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: base.DISCORD_CLIENT_SECRET,
    
    // Derive URLs
    WEB_URL: webUrl,
    API_URL: apiUrl,
    NEXT_PUBLIC_API_URL: apiUrl, // Always matches API_URL
    
    // Derive ports
    WEB_PORT: webPort,
    API_PORT: apiPort,
    BOT_PORT: botPort,
    
    // Derive Discord redirect
    DISCORD_REDIRECT_URI: base.DISCORD_REDIRECT_URI || `${apiUrl}/auth/callback/discord`,
    
    // Smart defaults based on environment
    LOG_LEVEL: base.LOG_LEVEL || (isDev ? "debug" : "warn"),
    LOG_REQUESTS: logRequests,
    COOKIE_DOMAIN: base.COOKIE_DOMAIN || (isProd && base.BASE_DOMAIN ? `.${base.BASE_DOMAIN}` : undefined),
    RATE_LIMIT_ENABLED: rateLimitEnabled,
    
    // Optional pass-throughs
    BASE_DOMAIN: base.BASE_DOMAIN || 'ticketsbot.dev',
    PORT_OFFSET: portOffset,
    REDIS_URL: base.REDIS_URL,
    
    // Feature flags (pass through as-is)
    NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: base.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI ?? false,
    NEXT_PUBLIC_FEATURE_BULK_ACTIONS: base.NEXT_PUBLIC_FEATURE_BULK_ACTIONS ?? false,
    NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: base.NEXT_PUBLIC_FEATURE_ADVANCED_FORMS ?? false,
    NEXT_PUBLIC_GUILD_ID: base.NEXT_PUBLIC_GUILD_ID,
    
    // Development helpers
    DEV_PERMISSIONS_HEX: base.DEV_PERMISSIONS_HEX,
    DEV_GUILD_ID: base.DEV_GUILD_ID,
    DEV_DB_AUTO_SEED: base.DEV_DB_AUTO_SEED,
    
    // Legacy support
    TURBO_ENV: deriveTurboEnv(base.NODE_ENV),
  };
}

/**
 * Transform schema output to complete configuration
 */
export function transformEnv<T extends BaseEnvConfig>(
  parsedEnv: T
): CompleteEnvConfig {
  return deriveEnvironment(parsedEnv);
}

/**
 * Get environment summary for logging
 */
export function getEnvironmentSummary(env: CompleteEnvConfig): string {
  return `
📊 Environment Configuration:
   Environment: ${env.NODE_ENV}
   Base Domain: ${env.BASE_DOMAIN}
   
   🌐 URLs:
   Web: ${env.WEB_URL} (port ${env.WEB_PORT})
   API: ${env.API_URL} (port ${env.API_PORT})
   Bot: Port ${env.BOT_PORT}
   
   🗄️  Services:
   Database: Connected
   Redis: ${env.REDIS_URL ? 'Connected' : 'Not configured'}
   
   🔐 Auth:
   Discord OAuth: Configured
   Redirect URI: ${env.DISCORD_REDIRECT_URI}
   
   🚀 Features:
   New Ticket UI: ${env.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI}
   Bulk Actions: ${env.NEXT_PUBLIC_FEATURE_BULK_ACTIONS}
   Advanced Forms: ${env.NEXT_PUBLIC_FEATURE_ADVANCED_FORMS}
`;
}