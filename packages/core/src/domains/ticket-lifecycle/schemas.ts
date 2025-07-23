import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  DiscordUserIdSchema,
  TicketStatusSchema,
  JsonMetadataSchema,
} from "../../schemas/common";

/**
 * Ticket creation schema for lifecycle
 */
export const CreateTicketSchema = z.object({
  guildId: DiscordGuildIdSchema,
  channelId: DiscordChannelIdSchema,
  openerId: DiscordUserIdSchema,
  panelId: z.number().int().positive().nullable().optional(),
  panelOptionId: z.number().int().positive().nullable().optional(),
  subject: z.string().max(100).nullable().optional(),
  categoryId: DiscordChannelIdSchema.nullable().optional(),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Ticket claim schema
 */
export const ClaimTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  claimerId: DiscordUserIdSchema,
  force: z.boolean().default(false), // Force claim even if already claimed
});

/**
 * Ticket unclaim schema
 */
export const UnclaimTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  performedById: DiscordUserIdSchema,
});

/**
 * Ticket close schema
 */
export const CloseTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  closedById: DiscordUserIdSchema,
  reason: z.string().max(500).optional(),
  deleteChannel: z.boolean().default(false),
  notifyOpener: z.boolean().default(true),
});

/**
 * Ticket reopen schema
 */
export const ReopenTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  reopenedById: DiscordUserIdSchema,
  reason: z.string().max(500).optional(),
});

/**
 * Ticket state transition schema
 */
export const TicketStateTransitionSchema = z.object({
  ticketId: z.number().int().positive(),
  fromStatus: TicketStatusSchema,
  toStatus: TicketStatusSchema,
  performedById: DiscordUserIdSchema,
  reason: z.string().max(500).optional(),
});

/**
 * Lifecycle event schema
 */
export const LifecycleEventSchema = z.object({
  id: z.number(),
  ticketId: z.number(),
  timestamp: z.date(),
  action: z.enum(["created", "claimed", "unclaimed", "closed", "reopened", "transferred", "assigned"]),
  performedById: DiscordUserIdSchema,
  details: JsonMetadataSchema.nullable(),
  claimedById: DiscordUserIdSchema.nullable(),
  closedById: DiscordUserIdSchema.nullable(),
  closeReason: z.string().nullable(),
});

/**
 * Lifecycle history query schema
 */
export const LifecycleHistoryQuerySchema = z.object({
  ticketId: z.number().int().positive(),
  actions: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).default(50),
});

/**
 * Type inference helpers
 */
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type ClaimTicketInput = z.infer<typeof ClaimTicketSchema>;
export type UnclaimTicketInput = z.infer<typeof UnclaimTicketSchema>;
export type CloseTicketInput = z.infer<typeof CloseTicketSchema>;
export type ReopenTicketInput = z.infer<typeof ReopenTicketSchema>;
export type TicketStateTransition = z.infer<typeof TicketStateTransitionSchema>;
export type LifecycleEvent = z.infer<typeof LifecycleEventSchema>;
export type LifecycleHistoryQuery = z.infer<typeof LifecycleHistoryQuerySchema>;