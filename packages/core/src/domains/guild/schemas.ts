import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  DiscordUserIdSchema,
  JsonMetadataSchema,
} from "../../utils/common";

export const CreateGuildSchema = z.object({
  id: DiscordGuildIdSchema,
  name: z.string().nullable().optional(),
});

export const UpdateGuildSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon_url: z.url({ error: "Invalid URL" }).nullable().optional(),
  owner_discord_id: DiscordUserIdSchema.nullable().optional(),
  ticket_category_id: DiscordChannelIdSchema.nullable().optional(),
  transcript_channel_id: DiscordChannelIdSchema.nullable().optional(),
  log_channel_id: DiscordChannelIdSchema.nullable().optional(),
  metadata: JsonMetadataSchema.optional(),
});

export const UpdateGuildSettingsSchema = z.object({
  ticket_category_id: DiscordChannelIdSchema.nullable().optional(),
  transcript_channel_id: DiscordChannelIdSchema.nullable().optional(),
  log_channel_id: DiscordChannelIdSchema.nullable().optional(),
});

export const GuildQuerySchema = z.object({
  id: DiscordGuildIdSchema.optional(),
  owner_discord_id: DiscordUserIdSchema.optional(),
});

export const GeneralSettingsSchema = z.object({
  maxTicketsPerUser: z
    .number()
    .int()
    .min(1, "Must allow at least 1 ticket")
    .max(10, "Cannot exceed 10 simultaneous tickets"),
  language: z.enum(["en", "es", "fr"], {
    error: "Unsupported language",
  }),
  ticketCloseConfirmation: z.boolean(),
  enableUserFeedback: z.boolean(),
  anonymousDashboard: z.boolean().optional(),
});

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

export const OpenCommandsSchema = z.object({
  enabled: z.boolean(),
  commands: z
    .array(z.string().min(1, "Command name required").max(32, "Command name too long"))
    .max(10, "Maximum 10 commands allowed"),
  cooldown: z.number().int().min(0).max(300).optional(),
});

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

export type CreateGuildInput = z.infer<typeof CreateGuildSchema>;
export type UpdateGuildInput = z.infer<typeof UpdateGuildSchema>;
export type UpdateGuildSettingsInput = z.infer<typeof UpdateGuildSettingsSchema>;
export type GuildQuery = z.infer<typeof GuildQuerySchema>;
export type GeneralSettingsInput = z.infer<typeof GeneralSettingsSchema>;
export type AutoCloseInput = z.infer<typeof AutoCloseSchema>;
export type OpenCommandsInput = z.infer<typeof OpenCommandsSchema>;
export type ContextMenuInput = z.infer<typeof ContextMenuSchema>;
