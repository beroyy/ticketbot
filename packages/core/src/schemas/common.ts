import { z } from "zod";
import { TicketStatus as PrismaTicketStatus } from "@prisma/client";

export const DiscordIdSchema = z
  .string()
  .refine((val) => /^\d+$/.test(val), "Must be a valid Discord snowflake ID");

export const DiscordUserIdSchema = DiscordIdSchema;
export const DiscordGuildIdSchema = DiscordIdSchema;
export const DiscordChannelIdSchema = DiscordIdSchema;

export const CuidSchema = z
  .string()
  .refine((val) => val.length >= 20 && val.length <= 32, "Must be a valid CUID");

export const TimestampSchema = z.date();

export const TicketStatusSchema = z.nativeEnum(PrismaTicketStatus);
export const UserRoleSchema = z.enum(["opener", "participant"]);
export const PanelTypeSchema = z.enum(["SINGLE", "MULTI"]);

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

export const ColorHexSchema = z
  .string()
  .refine((val) => /^#[0-9a-fA-F]{6}$/.test(val), "Must be a valid hex color");
export const HexColorSchema = ColorHexSchema;
export const EmojiSchema = z.string().max(64);
export const UrlSchema = z.string().url("Must be a valid URL").describe("URL");

export const JsonSchema = z.record(z.string(), z.unknown());

export const PositiveIntSchema = z.number().int().positive();
export const NonNegativeIntSchema = z.number().int().min(0);

export const BigIntStringSchema = z.string().refine((val) => {
  try {
    BigInt(val);
    return true;
  } catch {
    return false;
  }
}, "Must be a valid BigInt string");

export const DiscordUsernameSchema = z.string().min(1).max(32);
export const DiscordDiscriminatorSchema = z
  .string()
  .refine((val) => /^\d{4}$/.test(val), "Must be a 4-digit discriminator")
  .optional();

export const PrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const JsonMetadataSchema = z.record(z.string(), z.unknown()).nullable().optional();

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const DateRangeSchema = z.object({
  start: z.date().optional(),
  end: z.date().optional(),
});

export type DiscordId = z.infer<typeof DiscordIdSchema>;
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type PanelType = z.infer<typeof PanelTypeSchema>;
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
