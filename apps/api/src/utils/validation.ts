import { z, type ZodError, type ZodTypeAny, type ZodRawShape } from "zod";
import { logger } from "./logger";

export const prettifyZodError = (error: ZodError): string => {
  return z.prettifyError(error);
};

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

export const strictExtend = <T extends z.ZodObject<any>>(base: T, extension: ZodRawShape) => {
  return base.extend(extension).strict();
};

export const passthroughExtend = <T extends z.ZodObject<any>>(base: T, extension: ZodRawShape) => {
  return base.extend(extension).passthrough();
};

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

export const createSchemaRegistry = () => {
  const registry = z.registry();

  return {
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

    getAll: () => registry,

    toJSONSchema: () => {
      const schemas: Record<string, any> = {};
      return schemas;
    },
  };
};

export const patterns = {
  discordId: () =>
    z
      .string()
      .regex(/^[0-9]+$/, "Must be a valid Discord ID")
      .describe("Discord snowflake ID"),

  hexColor: () =>
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #5865F2)")
      .describe("Hex color code"),

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

  booleanString: () => z.stringbool(),

  pagination: () =>
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
};

export const createEnvSchema = <T extends ZodRawShape>(shape: T) => {
  return z.object(shape).transform((env) => {
    const keys = Object.keys(env);
    logger.info(`Loaded ${keys.length} environment variables`);
    return env;
  });
};

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

export const globalRegistry = createSchemaRegistry();
