/**
 * Client-safe exports for browser environments
 * This file contains only exports that don't use Node.js APIs
 */

// Re-export Zod for convenience
export { z } from "zod";

// Export all schemas (these are just type definitions, no Node.js dependencies)
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

// Export only browser-safe utilities
export { validateEnv, getEnvValue, formatEnvForLogging } from "./utils/env";

// Combined schema for full application
import { EnvironmentConfigSchema } from "./schemas/env";
import { DatabaseEnvSchema } from "./schemas/database";
import { ServicesEnvSchema } from "./schemas/services";

/**
 * Complete environment schema combining all sub-schemas
 */
export const CompleteEnvSchema = EnvironmentConfigSchema.merge(DatabaseEnvSchema.partial()).merge(
  ServicesEnvSchema.partial()
);

import type { z } from "zod";
export type CompleteEnv = z.infer<typeof CompleteEnvSchema>;

import { validateEnv } from "./utils/env";

/**
 * Validate environment variables from provided values
 * This is the main function for browser environments
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
  return validateEnv(schema, values);
};
