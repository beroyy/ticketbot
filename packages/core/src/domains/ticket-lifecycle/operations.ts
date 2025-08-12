import { prisma, TicketStatus } from "@ticketsbot/db";
import { Actor } from "../../context";
import { PermissionFlags } from "../../permissions/constants";
import { Ticket } from "../ticket";
import type {
  CreateTicketInput,
  ClaimTicketInput,
  UnclaimTicketInput,
  CloseTicketInput,
  ReopenTicketInput,
} from "./schemas";

// Export schemas
export {
  CreateTicketSchema,
  ClaimTicketSchema,
  UnclaimTicketSchema,
  CloseTicketSchema,
  ReopenTicketSchema,
  TicketStateTransitionSchema,
  LifecycleEventSchema,
  LifecycleHistoryQuerySchema,
  type CreateTicketInput,
  type ClaimTicketInput,
  type UnclaimTicketInput,
  type CloseTicketInput,
  type ReopenTicketInput,
  type TicketStateTransition,
  type LifecycleEvent,
  type LifecycleHistoryQuery,
} from "./schemas";

/**
 * TicketLifecycle domain - handles all ticket state transitions and lifecycle events
 */
export namespace TicketLifecycle {
  /**
   * Create a new ticket with all necessary validations and business logic
   */
  export const create = async (input: CreateTicketInput): Promise<any> => {
    const { CreateTicketSchema } = await import("./schemas");
    const parsed = CreateTicketSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      const guildId = parsed.guildId || Actor.guildId();
      const userId = parsed.openerId || Actor.userId();

      // Check if user is blacklisted
      // TODO: This should use tx instead of global prisma
      // const isBlacklisted = await User.isBlacklisted(guildId, userId);
      // if (isBlacklisted) {
      //   throw new Error("You are blacklisted from creating tickets.");
      // }

      // Get guild settings
      const guild = await tx.guild.findUnique({
        where: { id: guildId },
      });
      if (!guild) {
        throw new Error("Guild not properly configured.");
      }

      // Check ticket limit
      if (guild.maxTicketsPerUser > 0) {
        const openTicketCount = await tx.ticket.count({
          where: {
            guildId,
            openerId: userId,
            status: TicketStatus.OPEN,
            deletedAt: null,
          },
        });

        if (openTicketCount >= guild.maxTicketsPerUser) {
          throw new Error(`You can only have ${guild.maxTicketsPerUser} open ticket(s) at a time.`);
        }
      }

      // Get next ticket number
      const ticketNumber = guild.totalTickets + 1;

      // Create ticket record
      const ticket = await tx.ticket.create({
        data: {
          guildId,
          number: ticketNumber,
          panelId: parsed.panelId || null,
          panelOptionId: parsed.panelOptionId || null,
          openerId: userId,
          channelId: parsed.channelId,
          categoryId: parsed.categoryId || null,
          subject: parsed.subject || null,
          status: TicketStatus.OPEN,
        },
      });

      // Create initial lifecycle event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId: ticket.id,
          action: "created",
          performedById: userId,
          details: {
            subject: parsed.subject,
            panelId: parsed.panelId,
          },
        },
      });

      // Create transcript record
      await tx.transcript.create({
        data: {
          ticketId: ticket.id,
          formData: (parsed.metadata as any) || null,
        },
      });

      // Add opener as participant
      await tx.ticketParticipant.create({
        data: {
          ticketId: ticket.id,
          userId: userId,
          role: "opener",
        },
      });

      // Update guild ticket counter
      await tx.guild.update({
        where: { id: guildId },
        data: { totalTickets: ticketNumber },
      });

      // Event logging removed - TCN will handle this automatically

      return ticket;
    });
  };

  /**
   * Claim a ticket
   */
  export const claim = async (input: ClaimTicketInput): Promise<any> => {
    const { ClaimTicketSchema } = await import("./schemas");
    const parsed = ClaimTicketSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      const guildId = Actor.guildId();
      const claimerId = parsed.claimerId || Actor.userId();

      // Get the ticket
      const ticket = await tx.ticket.findUnique({
        where: { id: parsed.ticketId },
        select: {
          guildId: true,
          status: true,
          lifecycleEvents: {
            where: { action: "claimed" },
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      });

      if (!ticket || ticket.guildId !== guildId) {
        throw new Error("Ticket not found");
      }

      if (ticket.status !== TicketStatus.OPEN) {
        throw new Error("Can only claim open tickets");
      }

      // Check if already claimed
      const currentClaim = ticket.lifecycleEvents[0];
      if (currentClaim && !parsed.force) {
        throw new Error("Ticket is already claimed");
      }

      // Check permissions
      Actor.requirePermission(PermissionFlags.TICKET_CLAIM);

      // Create claim event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId: parsed.ticketId,
          action: "claimed",
          performedById: claimerId,
          claimedById: claimerId,
        },
      });

      // Update ticket status and claimedById
      const updated = await tx.ticket.update({
        where: { id: parsed.ticketId },
        data: {
          status: TicketStatus.CLAIMED,
          claimedById: claimerId,
          updatedAt: new Date(),
        },
      });

      // Event logging removed - TCN will handle this automatically

      return updated;
    });
  };

  /**
   * Unclaim a ticket
   */
  export const unclaim = async (input: UnclaimTicketInput): Promise<any> => {
    const { UnclaimTicketSchema } = await import("./schemas");
    const parsed = UnclaimTicketSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      const guildId = Actor.guildId();
      const performedById = parsed.performedById || Actor.userId();

      // Get the ticket
      const ticket = await tx.ticket.findUnique({
        where: { id: parsed.ticketId },
        select: {
          guildId: true,
          status: true,
          lifecycleEvents: {
            where: { action: "claimed" },
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      });

      if (!ticket || ticket.guildId !== guildId) {
        throw new Error("Ticket not found");
      }

      if (ticket.status !== TicketStatus.CLAIMED) {
        throw new Error("Ticket is not claimed");
      }

      const currentClaim = ticket.lifecycleEvents[0];
      if (!currentClaim) {
        throw new Error("No claim found");
      }

      // Check permissions - either the claimer or someone with TICKET_CLAIM permission
      if (currentClaim.claimedById !== performedById) {
        Actor.requirePermission(PermissionFlags.TICKET_CLAIM);
      }

      // Create unclaim event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId: parsed.ticketId,
          action: "unclaimed",
          performedById,
        },
      });

      // Update ticket status back to open and clear claimedById
      const updated = await tx.ticket.update({
        where: { id: parsed.ticketId },
        data: {
          status: TicketStatus.OPEN,
          claimedById: null,
          updatedAt: new Date(),
        },
      });

      // Event logging removed - TCN will handle this automatically

      return updated;
    });
  };

  /**
   * Close a ticket
   */
  export const close = async (input: CloseTicketInput): Promise<any> => {
    const { CloseTicketSchema } = await import("./schemas");
    const parsed = CloseTicketSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      const guildId = Actor.guildId();
      const closedById = parsed.closedById || Actor.userId();

      // Get the ticket
      const ticket = await Ticket.getByIdUnchecked(parsed.ticketId);

      if (!ticket || ticket.guildId !== guildId) {
        throw new Error("Ticket not found");
      }

      if (ticket.status === TicketStatus.CLOSED) {
        throw new Error("Ticket is already closed");
      }

      // Check permissions
      const isOwner = ticket.openerId === closedById;
      const isClaimer = ticket.lifecycleEvents?.some(
        (e: any) => e.action === "claimed" && e.claimedById === closedById
      );

      if (!isOwner && !isClaimer) {
        Actor.requirePermission(PermissionFlags.TICKET_CLOSE_ANY);
      }

      // Create close event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId: parsed.ticketId,
          action: "closed",
          performedById: closedById,
          closedById: closedById,
          closeReason: parsed.reason || null,
        },
      });

      // Update ticket
      const updated = await tx.ticket.update({
        where: { id: parsed.ticketId },
        data: {
          status: TicketStatus.CLOSED,
          closedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Event logging removed - TCN will handle this automatically

      return updated;
    });
  };

  /**
   * Reopen a closed ticket
   */
  export const reopen = async (input: ReopenTicketInput): Promise<any> => {
    const { ReopenTicketSchema } = await import("./schemas");
    const parsed = ReopenTicketSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      const guildId = Actor.guildId();
      const reopenedById = parsed.reopenedById || Actor.userId();

      // Get the ticket
      const ticket = await Ticket.getByIdUnchecked(parsed.ticketId);

      if (!ticket || ticket.guildId !== guildId) {
        throw new Error("Ticket not found");
      }

      if (ticket.status !== TicketStatus.CLOSED) {
        throw new Error("Can only reopen closed tickets");
      }

      // Check permissions
      const isOwner = ticket.openerId === reopenedById;
      if (!isOwner) {
        Actor.requirePermission(PermissionFlags.TICKET_CLOSE_ANY);
      }

      // Create reopen event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId: parsed.ticketId,
          action: "reopened",
          performedById: reopenedById,
          details: {
            reason: parsed.reason,
          },
        },
      });

      // Update ticket
      const updated = await tx.ticket.update({
        where: { id: parsed.ticketId },
        data: {
          status: TicketStatus.OPEN,
          closedAt: null,
          updatedAt: new Date(),
        },
      });

      // Event logging removed - TCN will handle this automatically

      return updated;
    });
  };

  /**
   * Get lifecycle history for a ticket
   */
  export const getHistory = async (ticketId: number): Promise<any[]> => {
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const events = await prisma.ticketLifecycleEvent.findMany({
      where: { ticketId },
      orderBy: { timestamp: "desc" },
      include: {
        performedBy: true,
        claimedBy: true,
        closedBy: true,
      },
    });

    return events;
  };

  /**
   * Get current claim status
   */
  export const getCurrentClaim = async (ticketId: number): Promise<any> => {
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    return prisma.ticketLifecycleEvent.findFirst({
      where: {
        ticketId,
        action: "claimed",
      },
      orderBy: { timestamp: "desc" },
      include: {
        claimedBy: true,
      },
    });
  };

  /**
   * Request to close a ticket with optional auto-close scheduling
   */
  export const requestClose = async (input: {
    ticketId: number;
    requestedById: string;
    reason?: string;
    autoCloseHours?: number;
  }): Promise<{ closeRequestId: string; autoCloseJobId: string | null }> => {
    return prisma.$transaction(async (tx) => {
      const guildId = Actor.guildId();

      // Get the ticket
      const ticket = await tx.ticket.findUnique({
        where: { id: input.ticketId },
        select: {
          guildId: true,
          status: true,
          closeRequestId: true,
          openerId: true,
          excludeFromAutoclose: true,
        },
      });

      if (!ticket || ticket.guildId !== guildId) {
        throw new Error("Ticket not found");
      }

      if (ticket.status !== TicketStatus.OPEN) {
        throw new Error("Can only request to close open tickets");
      }

      if (ticket.closeRequestId) {
        throw new Error("A close request is already pending for this ticket");
      }

      // Generate close request ID
      const closeRequestId = `cr_${input.ticketId}_${Date.now()}`;

      // Create close request event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId: input.ticketId,
          action: "close_requested",
          performedById: input.requestedById,
          details: {
            reason: input.reason,
            autoCloseHours: input.autoCloseHours,
          },
        },
      });

      // Update ticket with close request info
      await tx.ticket.update({
        where: { id: input.ticketId },
        data: {
          closeRequestId,
          closeRequestBy: input.requestedById,
          closeRequestReason: input.reason || null,
          closeRequestCreatedAt: new Date(),
          autoCloseAt:
            input.autoCloseHours && !ticket.excludeFromAutoclose
              ? new Date(Date.now() + input.autoCloseHours * 60 * 60 * 1000)
              : null,
          updatedAt: new Date(),
        },
      });

      // Event logging removed - TCN will handle this automatically

      // With pg_cron, we don't need to track job IDs
      const autoCloseJobId: string | null = null;

      return { closeRequestId, autoCloseJobId };
    });
  };

  /**
   * Cancel a close request
   */
  export const cancelCloseRequest = async (
    ticketId: number,
    cancelledById: string
  ): Promise<void> => {
    return prisma.$transaction(async (tx) => {
      const guildId = Actor.guildId();

      // Get the ticket
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: {
          guildId: true,
          status: true,
          closeRequestId: true,
          openerId: true,
        },
      });

      if (!ticket || ticket.guildId !== guildId) {
        throw new Error("Ticket not found");
      }

      if (!ticket.closeRequestId) {
        throw new Error("No close request pending for this ticket");
      }

      // Only ticket opener can cancel close request
      if (ticket.openerId !== cancelledById) {
        throw new Error("Only the ticket opener can cancel the close request");
      }

      // Create cancel event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId,
          action: "close_request_cancelled",
          performedById: cancelledById,
        },
      });

      // Clear close request from ticket
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          closeRequestId: null,
          closeRequestBy: null,
          closeRequestReason: null,
          closeRequestCreatedAt: null,
          autoCloseAt: null,
          updatedAt: new Date(),
        },
      });

      // Event logging removed - TCN will handle this automatically

      // With pg_cron, cancellation happens automatically when we clear autoCloseAt
    });
  };

  /**
   * Auto-close a ticket (called by scheduled job)
   */
  export const autoClose = async (ticketId: number, closedById: string): Promise<any> => {
    return prisma.$transaction(async (tx) => {
      // Get the ticket
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: {
          guildId: true,
          status: true,
          closeRequestId: true,
          closeRequestBy: true,
          excludeFromAutoclose: true,
        },
      });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      if (ticket.status !== TicketStatus.OPEN) {
        throw new Error("Ticket is not open");
      }

      if (!ticket.closeRequestId) {
        throw new Error("No close request found");
      }

      if (ticket.excludeFromAutoclose) {
        throw new Error("Ticket excluded from auto-close");
      }

      // Create auto-close event
      await tx.ticketLifecycleEvent.create({
        data: {
          ticketId,
          action: "auto_closed",
          performedById: closedById,
          closedById: closedById,
          closeReason: "Automatically closed due to no response on close request",
        },
      });

      // Update ticket
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CLOSED,
          closedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Event logging removed - TCN will handle this automatically

      return updated;
    });
  };
}
