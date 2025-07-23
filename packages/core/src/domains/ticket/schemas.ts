import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  DiscordUserIdSchema,
  TicketStatusSchema,
  PaginationSchema,
  DateRangeSchema,
} from "../../schemas/common";

/**
 * Core ticket schema - slimmed down to essentials
 */
export const TicketCoreSchema = z.object({
  id: z.number(),
  guildId: DiscordGuildIdSchema,
  number: z.number().int().positive(),
  panelId: z.number().int().positive().nullable(),
  panelOptionId: z.number().int().positive().nullable(),
  openerId: DiscordUserIdSchema,
  channelId: DiscordChannelIdSchema,
  categoryId: DiscordChannelIdSchema.nullable(),
  subject: z.string().max(100).nullable(),
  status: TicketStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  closedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
});

/**
 * Basic ticket update schema
 */
export const UpdateTicketSchema = z.object({
  status: TicketStatusSchema.optional(),
  subject: z.string().max(100).nullable().optional(),
  categoryId: DiscordChannelIdSchema.nullable().optional(),
  excludeFromAutoclose: z.boolean().optional(),
});

/**
 * Core ticket query schema
 */
export const TicketQuerySchema = z.object({
  guildId: DiscordGuildIdSchema.optional(),
  openerId: DiscordUserIdSchema.optional(),
  panelId: z.number().int().positive().optional(),
  status: TicketStatusSchema.optional(),
  channelId: DiscordChannelIdSchema.optional(),
  dateRange: DateRangeSchema.optional(),
  pagination: PaginationSchema.optional(),
});

/**
 * Find by channel schema
 */
export const FindByChannelSchema = z.object({
  channelId: DiscordChannelIdSchema,
  includeDeleted: z.boolean().default(false),
});

/**
 * Ticket configuration schema for guild-level ticket settings
 */
export const TicketsConfigSchema = z.object({
  maxOpenTickets: z
    .number()
    .int()
    .min(1, "Must allow at least 1 ticket")
    .max(100, "Cannot exceed 100 tickets"),
  defaultCategory: DiscordChannelIdSchema.optional(),
  mentionOnOpen: z.boolean(),
  threadMode: z.boolean(),
  closeConfirmation: z.boolean(),
  transcriptOnClose: z.boolean(),
  ratingEnabled: z.boolean(),
  ratingEmoji: z.array(z.string().max(32)).max(5).optional(),
});

/**
 * Type inference helpers
 */
export type TicketCore = z.infer<typeof TicketCoreSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
export type TicketQuery = z.infer<typeof TicketQuerySchema>;
export type FindByChannelInput = z.infer<typeof FindByChannelSchema>;
export type TicketsConfigInput = z.infer<typeof TicketsConfigSchema>;
