import { createDomainEventEmitter, type EventSchemas } from "@bot/lib/discord-utils";
import { z } from "zod";

/**
 * Domain event schemas for the ticketsbot
 * These events are emitted when significant actions occur in the system
 */
export const TicketEventSchemas = {
  "ticket.created": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    openerId: z.string(),
    channelId: z.string(),
    subject: z.string().optional().nullable(),
    panelId: z.number().optional().nullable(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    createdAt: z.date(),
  }),

  "ticket.closed": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    closedById: z.string(),
    reason: z.string().optional().nullable(),
    closedAt: z.date(),
    channelDeleted: z.boolean().optional(),
  }),

  "ticket.claimed": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    claimedById: z.string(),
    claimedAt: z.date(),
  }),

  "ticket.unclaimed": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    unclaimedById: z.string(),
    unclaimedAt: z.date(),
  }),

  "ticket.transferred": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    fromUserId: z.string(),
    toUserId: z.string(),
    transferredById: z.string(),
    transferredAt: z.date(),
  }),

  "ticket.userAdded": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    userId: z.string(),
    addedById: z.string(),
    addedAt: z.date(),
  }),

  "ticket.userRemoved": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    userId: z.string(),
    removedById: z.string(),
    removedAt: z.date(),
  }),

  "ticket.feedbackReceived": z.object({
    ticketId: z.number(),
    ticketNumber: z.number(),
    guildId: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional().nullable(),
    respondentId: z.string(),
    receivedAt: z.date(),
  }),
} as const satisfies EventSchemas;

// Create the typed event emitter
export const domainEvents = createDomainEventEmitter(TicketEventSchemas);

// Export types for use in listeners
export type DomainEventName = keyof typeof TicketEventSchemas;
export type DomainEventData<E extends DomainEventName> = z.infer<(typeof TicketEventSchemas)[E]>;
