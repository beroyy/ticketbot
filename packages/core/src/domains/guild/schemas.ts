import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  DiscordUserIdSchema,
  JsonMetadataSchema,
} from "../../schemas/common";

/**
 * Guild creation schema - only required fields for initial creation
 */
export const CreateGuildSchema = z.object({
  id: DiscordGuildIdSchema,
  name: z.string().nullable().optional(), // nullable in DB
});

/**
 * Guild update schema - all fields optional except ID
 */
export const UpdateGuildSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon_url: z.url({ error: "Invalid URL" }).nullable().optional(),
  owner_discord_id: DiscordUserIdSchema.nullable().optional(),
  ticket_category_id: DiscordChannelIdSchema.nullable().optional(),
  transcript_channel_id: DiscordChannelIdSchema.nullable().optional(),
  log_channel_id: DiscordChannelIdSchema.nullable().optional(),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Guild settings update schema - for bot configuration
 */
export const UpdateGuildSettingsSchema = z.object({
  ticket_category_id: DiscordChannelIdSchema.nullable().optional(),
  transcript_channel_id: DiscordChannelIdSchema.nullable().optional(),
  log_channel_id: DiscordChannelIdSchema.nullable().optional(),
});

/**
 * Guild query schema
 */
export const GuildQuerySchema = z.object({
  id: DiscordGuildIdSchema.optional(),
  owner_discord_id: DiscordUserIdSchema.optional(),
});

/**
 * General settings schema for guild configuration
 */
export const GeneralSettingsSchema = z.object({
  maxTicketsPerUser: z
    .number()
    .int()
    .min(1, "Must allow at least 1 ticket")
    .max(10, "Cannot exceed 10 simultaneous tickets"),
  language: z.enum(["en", "es", "fr"], {
    error: "Unsupported language",
  }),
  allowUsersToClose: z.boolean(),
  ticketCloseConfirmation: z.boolean(),
  enableUserFeedback: z.boolean(),
  anonymousDashboard: z.boolean().optional(),
});

/**
 * Auto-close configuration schema
 */
export const AutoCloseSchema = z.object({
  enabled: z.boolean(),
  inactiveHours: z
    .number()
    .int()
    .min(1, "Must be at least 1 hour")
    .max(720, "Cannot exceed 30 days"),
  warningMessage: z.string().max(1000).optional(),
  exemptRoles: z.array(DiscordUserIdSchema).optional(),
});

/**
 * Open commands configuration schema
 */
export const OpenCommandsSchema = z.object({
  enabled: z.boolean(),
  commands: z
    .array(z.string().min(1, "Command name required").max(32, "Command name too long"))
    .max(10, "Maximum 10 commands allowed"),
  cooldown: z.number().int().min(0).max(300).optional(),
});

/**
 * Context menu configuration schema
 */
export const ContextMenuSchema = z.object({
  enabled: z.boolean(),
  options: z
    .array(
      z.object({
        label: z.string().min(1, "Label required").max(100, "Label too long"),
        emoji: z.string().max(32).optional(),
        description: z.string().max(100).optional(),
      })
    )
    .max(25, "Maximum 25 menu options allowed"),
});

/**
 * Type inference helpers
 */
export type CreateGuildInput = z.infer<typeof CreateGuildSchema>;
export type UpdateGuildInput = z.infer<typeof UpdateGuildSchema>;
export type UpdateGuildSettingsInput = z.infer<typeof UpdateGuildSettingsSchema>;
export type GuildQuery = z.infer<typeof GuildQuerySchema>;
export type GeneralSettingsInput = z.infer<typeof GeneralSettingsSchema>;
export type AutoCloseInput = z.infer<typeof AutoCloseSchema>;
export type OpenCommandsInput = z.infer<typeof OpenCommandsSchema>;
export type ContextMenuInput = z.infer<typeof ContextMenuSchema>;
