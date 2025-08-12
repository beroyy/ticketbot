import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  DiscordUserIdSchema,
  TicketStatusSchema,
  PaginationSchema,
  DateRangeSchema,
} from "../../utils/common";

export const UpdateTicketSchema = z.object({
  status: TicketStatusSchema.optional(),
  subject: z.string().max(100).nullable().optional(),
  categoryId: DiscordChannelIdSchema.nullable().optional(),
  excludeFromAutoclose: z.boolean().optional(),
});

export const TicketQuerySchema = z.object({
  guildId: DiscordGuildIdSchema.optional(),
  openerId: DiscordUserIdSchema.optional(),
  panelId: z.number().int().positive().optional(),
  status: TicketStatusSchema.optional(),
  channelId: DiscordChannelIdSchema.optional(),
  dateRange: DateRangeSchema.optional(),
  pagination: PaginationSchema.optional(),
});

export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
export type TicketQuery = z.infer<typeof TicketQuerySchema>;
