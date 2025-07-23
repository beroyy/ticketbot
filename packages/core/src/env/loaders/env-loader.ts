/**
 * Environment loader
 * 
 * Loads environment variables and transforms them to complete configuration
 */

import type { z } from "zod";
import { loadDotenv } from "./dotenv";
import { validateEnv } from "../utils/env";
import { EnvSchema } from "../schemas/env-schema";
import { transformEnv } from "../transformers";
import type { CompleteEnvConfig } from "../transformers";

/**
 * Load and validate environment, then transform to complete configuration
 * 
 * This is the standard way to load environment variables in the monorepo.
 * It validates required variables and derives additional values automatically.
 * 
 * @param options - Options for loading the .env file
 * @returns Complete environment configuration with all derived values
 * 
 * @example
 * ```typescript
 * // In your app's env.ts file:
 * import { loadEnv } from "@ticketsbot/core/env";
 * 
 * export const env = loadEnv();
 * 
 * // Access derived values
 * console.log(env.API_URL); // Derived from NODE_ENV and PORT_OFFSET
 * console.log(env.WEB_PORT); // Derived from PORT_OFFSET
 * ```
 */
export function loadEnv(options?: {
  path?: string;
  override?: boolean;
  encoding?: BufferEncoding;
}): CompleteEnvConfig {
  // Load .env file if not already loaded
  loadDotenv(options);
  
  // Validate environment
  const env = validateEnv(EnvSchema);
  
  // Transform to complete configuration
  return transformEnv(env);
}

/**
 * Create app-specific environment loader with additional validation
 * 
 * @param appSchema - Additional app-specific schema to validate
 * @returns Function that loads and validates environment for the app
 * 
 * @example
 * ```typescript
 * // Create loader for API app
 * const loadApiEnv = createAppEnvLoader(
 *   z.object({
 *     // App-specific overrides
 *     API_RATE_LIMIT: z.number().optional(),
 *   })
 * );
 * 
 * export const env = loadApiEnv();
 * ```
 */
export function createAppEnvLoader<T extends z.ZodRawShape>(
  appSchema: z.ZodObject<T>
) {
  return function loadAppEnv(options?: {
    path?: string;
    override?: boolean;
    encoding?: BufferEncoding;
  }): CompleteEnvConfig & z.infer<typeof appSchema> {
    // Load base environment
    const baseEnv = loadEnv(options);
    
    // Validate app-specific additions
    const appEnv = validateEnv(appSchema);
    
    // Merge configurations
    return {
      ...baseEnv,
      ...appEnv,
    };
  };
}