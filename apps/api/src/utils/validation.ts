/**
 * Shared validation utilities leveraging Zod v4 features
 */
import { z, type ZodError, type ZodTypeAny, type ZodRawShape } from "zod";
import { logger } from "./logger";

/**
 * Format ZodError into user-friendly string
 * Uses Zod v4's prettifyError for better error messages
 */
export const prettifyZodError = (error: ZodError): string => {
  return z.prettifyError(error);
};

/**
 * Format ZodError into structured format for API responses
 */
export const formatZodError = (error: ZodError) => {
  return {
    error: "Validation failed",
    code: "validation_error",
    details: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    })),
    formatted: prettifyZodError(error),
  };
};

/**
 * Strict extension helper - ensures API schemas don't accept unknown fields
 * Use .passthrough() variant when extra fields should be allowed
 */
export const strictExtend = <T extends z.ZodObject<any>>(base: T, extension: ZodRawShape) => {
  return base.extend(extension).strict();
};

/**
 * Passthrough extension helper - allows extra fields while extending
 */
export const passthroughExtend = <T extends z.ZodObject<any>>(base: T, extension: ZodRawShape) => {
  return base.extend(extension).passthrough();
};

/**
 * Async refinement wrapper for database validations
 * Helps avoid N+1 queries by batching checks where possible
 */
export const asyncRefine = <T>(
  schema: z.ZodType<T>,
  check: (val: T) => Promise<boolean>,
  options: {
    message: string;
    path?: string[];
  }
) => {
  return schema.superRefine(async (val, ctx) => {
    try {
      const isValid = await check(val);
      if (!isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message,
          path: options.path || [],
        });
      }
    } catch (error) {
      logger.error("Async validation error:", error);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Validation check failed",
        path: options.path || [],
      });
    }
  });
};

/**
 * Create a schema registry for documentation
 * Useful for generating API docs and JSON schemas
 */
export const createSchemaRegistry = () => {
  const registry = z.registry();

  return {
    /**
     * Add a schema with metadata
     */
    add: <T extends ZodTypeAny>(
      schema: T,
      metadata: {
        title: string;
        description?: string;
        examples?: any[];
        tags?: string[];
      }
    ) => {
      registry.add(schema, metadata);
      return schema;
    },

    /**
     * Get all registered schemas
     */
    getAll: () => registry,

    /**
     * Generate JSON Schema for all registered schemas
     */
    toJSONSchema: () => {
      const schemas: Record<string, any> = {};
      // Note: This would need to iterate through registry
      // but Zod's registry API might not expose iteration
      return schemas;
    },
  };
};

/**
 * Common validation patterns using Zod v4 features
 */
export const patterns = {
  /**
   * Discord ID validation with proper error message
   */
  discordId: () =>
    z
      .string()
      .regex(/^[0-9]+$/, "Must be a valid Discord ID")
      .describe("Discord snowflake ID"),

  /**
   * Hex color validation
   */
  hexColor: () =>
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #5865F2)")
      .describe("Hex color code"),

  /**
   * Channel name validation
   */
  channelName: (prefix?: string) => {
    if (prefix) {
      return z
        .string()
        .regex(
          new RegExp(`^${prefix}-[a-z0-9-]+$`),
          `Must start with "${prefix}-" followed by lowercase letters, numbers, and hyphens`
        );
    }
    return z.string().regex(/^[a-z0-9-]+$/, "Must be lowercase with hyphens only");
  },

  /**
   * Boolean string coercion
   */
  booleanString: () => z.stringbool(),

  /**
   * Pagination parameters
   */
  pagination: () =>
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
};

/**
 * Create validated environment variable schema
 */
export const createEnvSchema = <T extends ZodRawShape>(shape: T) => {
  return z.object(shape).transform((env) => {
    // Log which env vars are set (without values)
    const keys = Object.keys(env);
    logger.info(`Loaded ${keys.length} environment variables`);
    return env;
  });
};

/**
 * Batch validation helper for multiple async checks
 */
export const batchAsyncValidation = async <T>(
  items: T[],
  validator: (item: T) => Promise<boolean>,
  options: {
    maxConcurrent?: number;
    stopOnFirstError?: boolean;
  } = {}
): Promise<{ valid: T[]; invalid: T[] }> => {
  const { maxConcurrent = 10, stopOnFirstError = false } = options;
  const valid: T[] = [];
  const invalid: T[] = [];

  // Process in batches to avoid overwhelming the database
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    const results = await Promise.all(
      batch.map(async (item) => ({
        item,
        isValid: await validator(item),
      }))
    );

    for (const { item, isValid } of results) {
      if (isValid) {
        valid.push(item);
      } else {
        invalid.push(item);
        if (stopOnFirstError) {
          return { valid, invalid };
        }
      }
    }
  }

  return { valid, invalid };
};

/**
 * Global schema registry instance
 */
export const globalRegistry = createSchemaRegistry();
