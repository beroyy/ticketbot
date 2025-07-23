import { ZodError, type ZodSchema } from "zod";
import type { z as zod } from "zod";

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/**
 * Validation error type
 */
export interface ValidationError {
  path: string;
  message: string;
  code?: string;
}

/**
 * Validation service for database operations
 */
export const ValidationService = {
  /**
   * Validate data against a schema
   */
  validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const validated = schema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationError[] = error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        }));
        return { success: false, errors };
      }
      throw error;
    }
  },

  /**
   * Validate data and throw if invalid
   */
  validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
  },

  /**
   * Safe parse with default value
   */
  validateWithDefault<T>(schema: ZodSchema<T>, data: unknown, defaultValue: T): T {
    const result = schema.safeParse(data);
    return result.success ? result.data : defaultValue;
  },

  /**
   * Validate partial data (for updates)
   */
  validatePartial<T extends zod.ZodRawShape>(
    schema: zod.ZodObject<T>,
    data: unknown
  ): ValidationResult<Partial<zod.infer<zod.ZodObject<T>>>> {
    const partialSchema = schema.partial();
    return this.validate(partialSchema, data) as ValidationResult<
      Partial<zod.infer<zod.ZodObject<T>>>
    >;
  },

  /**
   * Strip unknown properties from data
   */
  sanitize<T>(schema: ZodSchema<T>, data: unknown): T | null {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
  },

  /**
   * Create a validated database operation wrapper
   */
  createValidatedOperation<TInput, TOutput>(
    inputSchema: ZodSchema<TInput>,
    operation: (data: TInput) => Promise<TOutput>
  ) {
    return async (data: unknown): Promise<TOutput> => {
      const validated = this.validateOrThrow(inputSchema, data);
      return operation(validated);
    };
  },

  /**
   * Format validation errors for API responses
   */
  formatErrors(errors: ValidationError[]): string {
    return errors
      .map((err) => {
        const field = err.path || "value";
        return `${field}: ${err.message}`;
      })
      .join(", ");
  },

  /**
   * Check if error is a validation error
   */
  isValidationError(error: unknown): error is ZodError {
    return error instanceof ZodError;
  },

  /**
   * Extract field errors for form validation
   */
  getFieldErrors(error: ZodError): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};

    error.issues.forEach((err) => {
      const field = err.path.join(".");
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field]?.push(err.message);
    });

    return fieldErrors;
  },
};

/**
 * Helper function to create a validated database method
 */
export function validated<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  fn: (data: TInput) => Promise<TOutput>
) {
  return ValidationService.createValidatedOperation(schema, fn);
}

/**
 * Export validation utilities
 */
export { z, ZodError, type ZodSchema } from "zod";
