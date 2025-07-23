/**
 * Database-specific environment configuration schemas
 */

import { z } from "zod";

// PostgreSQL connection string validation
export const PostgresUrlSchema = z
  .string()
  .min(1)
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "postgresql:" || parsed.protocol === "postgres:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid PostgreSQL connection string" }
  );

// Redis connection string validation
export const RedisUrlSchema = z
  .string()
  .min(1)
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "redis:" || parsed.protocol === "rediss:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid Redis connection string" }
  );

// Database environment schema
export const DatabaseEnvSchema = z.object({
  // Primary database
  DATABASE_URL: PostgresUrlSchema,

  // Optional direct connection (for migrations)
  DIRECT_URL: PostgresUrlSchema.optional(),

  // Redis for caching/sessions
  REDIS_URL: RedisUrlSchema.optional(),

  // Connection pool settings
  DATABASE_POOL_SIZE: z.number().int().min(1).max(100).default(10).optional(),
  DATABASE_CONNECTION_TIMEOUT: z.number().int().min(1000).default(5000).optional(),

  // Redis settings
  REDIS_MAX_RETRIES: z.number().int().min(0).default(3).optional(),
  REDIS_RETRY_DELAY: z.number().int().min(100).default(500).optional(),
});

export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>;
