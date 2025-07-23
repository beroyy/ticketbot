/**
 * @ticketsbot/env-config
 *
 * Environment configuration and validation for TicketsBot
 */

// Export schemas
export {
  EnvironmentSchema,
  NodeEnvSchema,
  LogLevelSchema,
  type Environment,
  type NodeEnv,
  type LogLevel,
  DEFAULT_PORTS,
  ENVIRONMENT_URLS,
  EnvironmentConfigSchema,
  type EnvironmentConfig,
} from "./schemas/env";

export {
  PostgresUrlSchema,
  RedisUrlSchema,
  DatabaseEnvSchema,
  type DatabaseEnv,
} from "./schemas/database";

export {
  DiscordEnvSchema,
  AuthEnvSchema,
  ExternalServicesEnvSchema,
  ServicesEnvSchema,
  type ServicesEnv,
} from "./schemas/services";

// Export loaders
export { type DotenvOptions, loadDotenv, loadEnvFile } from "./loaders/dotenv";

export { getEnv, requireEnv, getBooleanEnv, getNumberEnv } from "./loaders";

// Export utilities
export {
  isDevelopment,
  isProduction,
  isTest,
  getCurrentEnv,
  validateEnv,
  getEnvValue,
  formatEnvForLogging,
} from "./utils/env";

export { findMonorepoRoot, clearRootCache } from "./utils/find-root";

// Convenience re-exports
export { z } from "zod";

// Combined schema for full application
import type { z } from "zod";
import { EnvironmentConfigSchema } from "./schemas/env";
import { DatabaseEnvSchema } from "./schemas/database";
import { ServicesEnvSchema } from "./schemas/services";
import { loadDotenv } from "./loaders/dotenv";
import { validateEnv as validateEnvironment } from "./utils/env";

/**
 * Complete environment schema combining all sub-schemas
 */
export const CompleteEnvSchema = EnvironmentConfigSchema.merge(DatabaseEnvSchema.partial()).merge(
  ServicesEnvSchema.partial()
);

export type CompleteEnv = z.infer<typeof CompleteEnvSchema>;

/**
 * Load and validate environment variables from .env file
 * This is a convenience wrapper that combines loading and validation
 *
 * NOTE: This function uses Node.js filesystem APIs and cannot be used in the browser.
 * For browser-safe validation, use `validateEnvFromValues` instead.
 *
 * @param schema - The Zod schema to validate against
 * @param options - Options for loading the .env file
 * @returns The validated environment object
 *
 * @example
 * ```typescript
 * // Load and validate at app startup
 * const env = loadAndValidateEnv(CompleteEnvSchema);
 *
 * // Or with custom schema
 * const apiEnv = loadAndValidateEnv(ApiEnvSchema);
 * ```
 */
export const loadAndValidateEnv = <T>(
  schema: z.ZodSchema<T>,
  options?: {
    path?: string;
    override?: boolean;
    encoding?: BufferEncoding;
  }
): T => {
  // Load .env file
  loadDotenv(options);

  // Validate the environment
  return validateEnvironment(schema);
};

/**
 * Validate environment variables from provided values
 * This is a browser-safe version that doesn't load files
 *
 * @param schema - The Zod schema to validate against
 * @param values - The environment values to validate (defaults to process.env)
 * @returns The validated environment object
 *
 * @example
 * ```typescript
 * // In browser/client code
 * const env = validateEnvFromValues(ClientEnvSchema);
 *
 * // Or with custom values
 * const env = validateEnvFromValues(schema, customValues);
 * ```
 */
export const validateEnvFromValues = <T>(
  schema: z.ZodSchema<T>,
  values: Record<string, unknown> = process.env
): T => {
  return validateEnvironment(schema, values);
};
