import { z } from "zod";
import { Actor } from "../../context";

/**
 * Context type for domain functions
 */
export interface DomainContext {
  actor: Actor;
  guildId: string;
}

/**
 * Result type for domain functions
 */
export type DomainResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Create a domain function with automatic validation and context
 */
export function fn<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (input: TInput, context: DomainContext) => Promise<TOutput>
) {
  return async (input: TInput): Promise<DomainResult<TOutput>> => {
    try {
      // Validate input
      const validatedInput = schema.parse(input);

      // Get context
      const actor = Actor.use();
      const guildId = Actor.guildId();

      // Execute handler
      const result = await handler(validatedInput, { actor, guildId });

      return { ok: true, value: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues
          .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        return { ok: false, error: errors };
      }

      return {
        ok: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      };
    }
  };
}
