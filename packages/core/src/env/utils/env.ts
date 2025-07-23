/**
 * Environment utilities
 */

import { z } from "zod";
import type { Environment } from "../schemas/env";

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === "development" || process.env.TURBO_ENV === "dev";
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === "production";
};

/**
 * Check if running in test environment
 */
export const isTest = (): boolean => {
  return process.env.NODE_ENV === "test";
};

/**
 * Get current environment
 */
export const getCurrentEnv = (): Environment => {
  const env = process.env.TURBO_ENV || process.env.NODE_ENV;

  switch (env) {
    case "development":
    case "dev":
      return "dev";
    case "staging":
      return "staging";
    case "production":
    case "prod":
      return "prod";
    default:
      return "dev";
  }
};

/**
 * Validate environment variables against schema
 */
export const validateEnv = <T>(
  schema: z.ZodSchema<T>,
  env: Record<string, unknown> = process.env
): T => {
  try {
    return schema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          const message = issue.message;
          return `  - ${path}: ${message}`;
        })
        .join("\n");

      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
};

/**
 * Get environment-specific value
 */
export const getEnvValue = <T>(values: Record<Environment, T>): T => {
  const env = getCurrentEnv();
  return values[env];
};

/**
 * Format environment variables for logging (hide sensitive values)
 */
export const formatEnvForLogging = (
  env: Record<string, unknown>,
  sensitiveKeys: string[] = []
): Record<string, unknown> => {
  const defaultSensitive = ["TOKEN", "SECRET", "PASSWORD", "KEY", "DATABASE_URL", "REDIS_URL"];

  const allSensitive = [...defaultSensitive, ...sensitiveKeys];

  return Object.entries(env).reduce(
    (acc, [key, value]) => {
      const isSensitive = allSensitive.some((sensitive) => key.toUpperCase().includes(sensitive));

      acc[key] = isSensitive ? "[REDACTED]" : value;
      return acc;
    },
    {} as Record<string, unknown>
  );
};
