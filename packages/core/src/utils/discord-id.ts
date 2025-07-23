import { z } from "zod";

/**
 * Discord ID validation and parsing utilities
 */

export const DiscordIdSchemaV4 = z.string().regex(/^\d+$/, "Discord IDs must be numeric");

export function parseDiscordIdV4(id: string): { success: boolean; data?: string; error?: any } {
  const result = DiscordIdSchemaV4.safeParse(id);
  return result;
}

export function validateDiscordIdV4(id: string): string {
  const result = parseDiscordIdV4(id);
  if (!result.success) {
    throw new Error(`Invalid Discord ID format: "${id}". Discord IDs must be numeric.`);
  }
  return result.data!;
}
