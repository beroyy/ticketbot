import { z } from "zod";
import {
  PositiveIntSchema,
  DiscordIdSchema,
  DiscordUserIdSchema,
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  TicketStatusSchema,
} from "@ticketsbot/core";

export const SchemaNameSchema = z.enum([
  "discord-guild-id",
  "discord-channel-id",
  "discord-user-id",
  "ticket-status",
  "create-panel",
  "update-panel",
  "create-form",
  "update-form",
]);

export const IdParamSchema = z.object({
  id: PositiveIntSchema,
});

export const DiscordIdParamSchema = z.object({
  id: DiscordIdSchema,
});

export const GuildIdParamSchema = z.object({
  guildId: DiscordGuildIdSchema,
});

export const ChannelIdParamSchema = z.object({
  channelId: DiscordChannelIdSchema,
});

export const UserIdParamSchema = z.object({
  userId: DiscordUserIdSchema,
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const TicketQuerySchema = z.object({
  status: TicketStatusSchema.optional(),
  assignedTo: DiscordUserIdSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export const PreferenceKeySchema = z
  .string()
  .min(1)
  .max(50)
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Preference key must contain only alphanumeric characters, underscores, and hyphens"
  );

export const PreferenceParamSchema = z.object({
  key: PreferenceKeySchema,
});

export type SchemaName = z.infer<typeof SchemaNameSchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
export type DiscordIdParam = z.infer<typeof DiscordIdParamSchema>;
export type GuildIdParam = z.infer<typeof GuildIdParamSchema>;
export type ChannelIdParam = z.infer<typeof ChannelIdParamSchema>;
export type UserIdParam = z.infer<typeof UserIdParamSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type TicketQuery = z.infer<typeof TicketQuerySchema>;
export type PreferenceKey = z.infer<typeof PreferenceKeySchema>;
export type PreferenceParam = z.infer<typeof PreferenceParamSchema>;
