/**
 * Common schemas and utilities for entity validation
 *
 * TODO: PRODUCTION UPGRADES NEEDED
 * - Add proper URL validation using Zod v4 syntax
 * - Add email validation for user schemas
 * - Add more robust Discord ID validation (snowflake format + timestamp validation)
 * - Add file upload validation (MIME types, size limits)
 * - Add rate limiting schemas for API endpoints
 * - Add pagination schemas for list responses
 */

import { z } from "zod";
import { TicketStatus as PrismaTicketStatus } from "../prisma/client";

// Discord ID validation (stored as string)
// TODO: Add snowflake timestamp validation and length checks
export const DiscordIdSchema = z
  .string()
  .refine((val) => /^\d+$/.test(val), "Must be a valid Discord snowflake ID");

// Specific Discord ID types
export const DiscordUserIdSchema = DiscordIdSchema;
export const DiscordGuildIdSchema = DiscordIdSchema;
export const DiscordChannelIdSchema = DiscordIdSchema;

// CUID validation for internal IDs
// TODO: Add proper CUID format validation (not just length)
export const CuidSchema = z
  .string()
  .refine((val) => val.length >= 20 && val.length <= 32, "Must be a valid CUID");

// Common timestamp schemas
export const TimestampSchema = z.date();

// Status enums
export const TicketStatusSchema = z.nativeEnum(PrismaTicketStatus);
export const UserRoleSchema = z.enum(["opener", "participant"]);
export const PanelTypeSchema = z.enum(["SINGLE", "MULTI"]);

// Form field types
export const FormFieldTypeSchema = z.enum([
  "short_text",
  "paragraph",
  "select",
  "email",
  "number",
  "url",
  "phone",
  "date",
  "checkbox",
  "radio",
]);

// Log levels (already defined in env, but exported here for consistency)
export const ActionTypeSchema = z.enum([
  "ticket_created",
  "ticket_claimed",
  "ticket_unclaimed",
  "ticket_closed",
  "ticket_reopened",
  "user_added",
  "user_removed",
  "message_sent",
  "form_submitted",
]);

// Utility schemas
export const ColorHexSchema = z
  .string()
  .refine((val) => /^#[0-9a-fA-F]{6}$/.test(val), "Must be a valid hex color");
export const HexColorSchema = ColorHexSchema; // Alias for compatibility
export const EmojiSchema = z.string().max(64); // TODO: Add Unicode emoji validation
export const UrlSchema = z.string().url("Must be a valid URL").describe("URL");

// JSON field schemas for Prisma JSON columns
export const JsonSchema = z.record(z.string(), z.unknown());

// Validation helpers
export const PositiveIntSchema = z.number().int().positive();
export const NonNegativeIntSchema = z.number().int().min(0);

// BigInt string schema (for permissions)
export const BigIntStringSchema = z.string().refine((val) => {
  try {
    BigInt(val);
    return true;
  } catch {
    return false;
  }
}, "Must be a valid BigInt string");

// Discord-specific validations
export const DiscordUsernameSchema = z.string().min(1).max(32);
export const DiscordDiscriminatorSchema = z
  .string()
  .refine((val) => /^\d{4}$/.test(val), "Must be a 4-digit discriminator")
  .optional();

// Priority schema
export const PrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// JSON metadata schema
export const JsonMetadataSchema = z.record(z.string(), z.unknown()).nullable().optional();

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// Date range schema
export const DateRangeSchema = z.object({
  start: z.date().optional(),
  end: z.date().optional(),
});

// Export common types
export type DiscordId = z.infer<typeof DiscordIdSchema>;
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type PanelType = z.infer<typeof PanelTypeSchema>;
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
