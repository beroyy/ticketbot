import { prisma } from "../client";
import { TicketStatus } from "..";

/**
 * Ticket domain operations
 * Includes both CRUD and lifecycle operations
 * All business logic for tickets is centralized here
 */

/**
 * Find a ticket by its Discord channel ID
 * No permission checks - use carefully
 * Returns tickets of any status
 */
export const getTicketByChannelId = async (channelId: string): Promise<any> => {
  return prisma.ticket.findFirst({
    where: {
      channelId,
      deletedAt: null,
    },
    include: {
      opener: true,
      panel: true,
    },
  });
};

/**
 * Check if a channel is a ticket channel
 * Returns just the ticket ID and basic info for performance
 */
export const isTicketChannel = async (
  channelId: string
): Promise<{ id: number; guildId: string; openerId: string } | null> => {
  return prisma.ticket.findFirst({
    where: {
      channelId,
      deletedAt: null,
    },
    select: {
      id: true,
      guildId: true,
      openerId: true,
    },
  });
};

/**
 * Get ticket by ID without permission checks
 * Only for system operations - prefer Ticket.getById() when you have context
 */
export const getByIdUnchecked = async (ticketId: number): Promise<any> => {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      guild: true,
      panel: true,
      opener: true,
    },
  });
};

/**
 * Get multiple tickets by IDs
 * Used for bulk operations
 */
export const getByIds = async (ticketIds: number[]): Promise<any[]> => {
  return prisma.ticket.findMany({
    where: {
      id: { in: ticketIds },
      deletedAt: null,
    },
  });
};

/**
 * Get ticket count by status for a guild
 * Used for statistics and dashboard displays
 */
export const getCountByStatus = async (guildId: string): Promise<Record<string, number>> => {
  const counts = await prisma.ticket.groupBy({
    by: ["status"],
    where: {
      guildId,
      deletedAt: null,
    },
    _count: true,
  });

  return counts.reduce(
    (acc: Record<string, number>, curr: { status: TicketStatus; _count: number }) => {
      acc[curr.status] = curr._count;
      return acc;
    },
    {} as Record<string, number>
  );
};

/**
 * Check if a user has any open tickets in a guild
 */
export const hasOpenTickets = async (guildId: string, userId: string): Promise<boolean> => {
  const count = await prisma.ticket.count({
    where: {
      guildId,
      openerId: userId,
      status: TicketStatus.OPEN,
      deletedAt: null,
    },
  });

  return count > 0;
};

/**
 * Remove a user from all ticket participants when they leave the guild
 * Returns count of affected tickets
 * Used by guild-member-remove listener
 */
export const removeParticipantFromAll = async (
  guildId: string,
  userId: string
): Promise<number> => {
  // First, find all tickets where the user is a participant
  const affectedTickets = await prisma.ticketParticipant.findMany({
    where: {
      userId,
      ticket: {
        guildId,
        status: {
          in: ["OPEN", "CLAIMED"],
        },
      },
    },
    select: {
      ticketId: true,
      ticket: {
        select: {
          number: true,
        },
      },
    },
  });

  if (affectedTickets.length === 0) {
    return 0;
  }

  // Delete all participant records for this user in this guild
  const result = await prisma.ticketParticipant.deleteMany({
    where: {
      userId,
      ticket: {
        guildId,
      },
    },
  });

  // Log removal details for debugging
  if (result.count > 0) {
    const ticketNumbers = affectedTickets.map(
      (t: { ticketId: number; ticket: { number: number } }) => t.ticket.number
    );
    console.log(
      `Removed user ${userId} from ${result.count} tickets in guild ${guildId}: #${ticketNumbers.join(
        ", #"
      )}`
    );
  }

  return result.count;
};

/**
 * Get ticket by ID with all relations
 * Same as getByIdUnchecked but with consistent naming
 */
export const getById = async (ticketId: number): Promise<any> => {
  return getByIdUnchecked(ticketId);
};

/**
 * Get count of open tickets for a user
 */
export const getUserOpenCount = async (userId: string): Promise<number> => {
  return prisma.ticket.count({
    where: {
      openerId: userId,
      status: TicketStatus.OPEN,
      deletedAt: null,
    },
  });
};

/**
 * Add a participant to a ticket
 */
export const addParticipant = async (
  ticketId: number,
  userId: string,
  role: "participant" | "support" = "participant"
): Promise<any> => {
  return prisma.ticketParticipant.upsert({
    where: {
      ticketId_userId: {
        ticketId,
        userId,
      },
    },
    update: {
      role,
    },
    create: {
      ticketId,
      userId,
      role,
    },
  });
};

/**
 * Remove a participant from a ticket
 */
export const removeParticipant = async (ticketId: number, userId: string): Promise<any> => {
  return prisma.ticketParticipant.delete({
    where: {
      ticketId_userId: {
        ticketId,
        userId,
      },
    },
  });
};

/**
 * Update ticket's channel ID
 */
export const updateChannelId = async (ticketId: number, channelId: string): Promise<any> => {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { channelId },
  });
};

/**
 * List tickets with filters
 */
export const list = async (filters: {
  guildId?: string;
  status?: string;
  openerId?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> => {
  const where: any = {
    deletedAt: null,
  };

  if (filters.guildId) where.guildId = filters.guildId;
  if (filters.status) where.status = filters.status;
  if (filters.openerId) where.openerId = filters.openerId;
  if (filters.assignedTo) where.assignedTo = filters.assignedTo;

  return prisma.ticket.findMany({
    where,
    take: filters.limit,
    skip: filters.offset,
    orderBy: { createdAt: "desc" },
    include: {
      opener: true,
      panel: true,
    },
  });
};

/**
 * Update ticket data
 */
export const update = async (ticketId: number, data: any): Promise<any> => {
  return prisma.ticket.update({
    where: { id: ticketId },
    data,
    include: {
      opener: true,
      panel: true,
    },
  });
};

// ============================================
// LIFECYCLE OPERATIONS (from ticket-lifecycle)
// ============================================

/**
 * Create a new ticket with lifecycle tracking
 */
export const create = async (data: {
  guildId: string;
  channelId: string;
  openerId: string;
  panelId?: number | null;
  subject?: string | null;
  categoryId?: string | null;
  metadata?: any;
}): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    // Get next ticket number for guild
    const lastTicket = await tx.ticket.findFirst({
      where: { guildId: data.guildId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    
    const nextNumber = (lastTicket?.number || 0) + 1;

    // Create the ticket
    const ticket = await tx.ticket.create({
      data: {
        guildId: data.guildId,
        channelId: data.channelId,
        openerId: data.openerId,
        panelId: data.panelId || null,
        subject: data.subject || null,
        categoryId: data.categoryId || null,
        status: TicketStatus.OPEN,
        number: nextNumber,
      },
      include: {
        opener: true,
        panel: true,
        guild: true,
      },
    });

    // Add opener as participant
    await tx.ticketParticipant.create({
      data: {
        ticketId: ticket.id,
        userId: data.openerId,
        role: "participant",
      },
    });

    // Create initial lifecycle event
    await tx.ticketLifecycleEvent.create({
      data: {
        ticketId: ticket.id,
        action: "ticket.created",
        performedById: data.openerId,
        details: {
          channelId: data.channelId,
          panelId: data.panelId,
          metadata: data.metadata,
        },
      },
    });

    return ticket;
  });
};

/**
 * Close a ticket
 */
export const close = async (data: {
  ticketId: number;
  closedById: string;
  reason?: string;
  deleteChannel?: boolean;
  notifyOpener?: boolean;
}): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    // Get ticket first
    const ticket = await tx.ticket.findUnique({
      where: { id: data.ticketId },
      include: {
        opener: true,
        guild: true,
      },
    });

    if (!ticket) {
      throw { code: "not_found", message: "Ticket not found" };
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw { code: "already_closed", message: "Ticket is already closed" };
    }

    // Update ticket status
    const updated = await tx.ticket.update({
      where: { id: data.ticketId },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
      include: {
        opener: true,
        panel: true,
        guild: true,
      },
    });

    // Add lifecycle event with closure details
    await tx.ticketLifecycleEvent.create({
      data: {
        ticketId: data.ticketId,
        action: "ticket.closed",
        performedById: data.closedById,
        closedById: data.closedById,
        closeReason: data.reason || null,
        details: {
          reason: data.reason,
          deleteChannel: data.deleteChannel,
          notifyOpener: data.notifyOpener,
        },
      },
    });

    return updated;
  });
};

/**
 * Claim a ticket
 */
export const claim = async (data: {
  ticketId: number;
  claimerId: string;
  force?: boolean;
}): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: data.ticketId },
      include: {
        opener: true,
        guild: true,
        claimedBy: true,
      },
    });

    if (!ticket) {
      throw { code: "not_found", message: "Ticket not found" };
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw { code: "ticket_closed", message: "Cannot claim a closed ticket" };
    }

    // Check if already claimed
    if (ticket.claimedById && !data.force) {
      throw { code: "already_claimed", message: "Ticket is already claimed" };
    }

    // Update ticket status and claimer
    const updated = await tx.ticket.update({
      where: { id: data.ticketId },
      data: {
        status: TicketStatus.CLAIMED,
        claimedById: data.claimerId,
      },
      include: {
        opener: true,
        panel: true,
        guild: true,
        claimedBy: true,
      },
    });

    // Add participant
    await tx.ticketParticipant.upsert({
      where: {
        ticketId_userId: {
          ticketId: data.ticketId,
          userId: data.claimerId,
        },
      },
      update: { role: "support" },
      create: {
        ticketId: data.ticketId,
        userId: data.claimerId,
        role: "support",
      },
    });

    // Add lifecycle event
    await tx.ticketLifecycleEvent.create({
      data: {
        ticketId: data.ticketId,
        action: "ticket.claimed",
        performedById: data.claimerId,
        claimedById: data.claimerId,
        details: {
          forced: data.force || false,
          previousClaimer: ticket.claimedById,
        },
      },
    });

    return updated;
  });
};

/**
 * Unclaim a ticket
 */
export const unclaim = async (data: {
  ticketId: number;
  performedById: string;
}): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: data.ticketId },
      include: {
        opener: true,
        guild: true,
        claimedBy: true,
      },
    });

    if (!ticket) {
      throw { code: "not_found", message: "Ticket not found" };
    }

    if (!ticket.claimedById) {
      throw { code: "not_claimed", message: "Ticket is not claimed" };
    }

    const previousClaimer = ticket.claimedById;

    // Update ticket
    const updated = await tx.ticket.update({
      where: { id: data.ticketId },
      data: {
        status: TicketStatus.OPEN,
        claimedById: null,
      },
      include: {
        opener: true,
        panel: true,
        guild: true,
      },
    });

    // Add lifecycle event
    await tx.ticketLifecycleEvent.create({
      data: {
        ticketId: data.ticketId,
        action: "ticket.unclaimed",
        performedById: data.performedById,
        details: {
          previousClaimer,
        },
      },
    });

    return updated;
  });
};

/**
 * Request to close a ticket
 */
export const requestClose = async (data: {
  ticketId: number;
  requestedById: string;
  reason?: string;
  autoCloseHours?: number;
}): Promise<{ closeRequestId: string }> => {
  const closeRequestId = `close_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await prisma.$transaction(async (tx) => {
    // Update ticket with close request
    await tx.ticket.update({
      where: { id: data.ticketId },
      data: {
        closeRequestId,
        closeRequestBy: data.requestedById,
        closeRequestReason: data.reason || null,
        closeRequestCreatedAt: new Date(),
        autoCloseAt: data.autoCloseHours 
          ? new Date(Date.now() + data.autoCloseHours * 60 * 60 * 1000)
          : null,
      },
    });

    // Add lifecycle event
    await tx.ticketLifecycleEvent.create({
      data: {
        ticketId: data.ticketId,
        action: "close.requested",
        performedById: data.requestedById,
        details: {
          reason: data.reason,
          autoCloseHours: data.autoCloseHours,
          closeRequestId,
        },
      },
    });
  });

  return { closeRequestId };
};

/**
 * Cancel a close request
 */
export const cancelCloseRequest = async (
  ticketId: number,
  cancelledById: string
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // Clear close request fields
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        closeRequestId: null,
        closeRequestBy: null,
        closeRequestReason: null,
        closeRequestCreatedAt: null,
        autoCloseAt: null,
      },
    });

    // Add lifecycle event
    await tx.ticketLifecycleEvent.create({
      data: {
        ticketId,
        action: "close.request_cancelled",
        performedById: cancelledById,
      },
    });
  });
};

/**
 * Update auto-close exclusion for a ticket
 */
export const updateAutoClose = async (
  ticketId: number,
  exclude: boolean,
  performedById: string
): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    // Update the exclusion status
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        excludeFromAutoclose: exclude,
      },
      include: {
        opener: true,
        panel: true,
        guild: true,
      },
    });

    // Log the change
    await tx.ticketLifecycleEvent.create({
      data: {
        ticketId: ticketId,
        action: exclude ? "auto_close_excluded" : "auto_close_included",
        performedById: performedById,
        details: {
          message: `Auto-close ${exclude ? "disabled" : "enabled"} by support staff`,
        },
        timestamp: new Date(),
      },
    });

    return updated;
  });
};

/**
 * Get current claim for a ticket (checks if ticket is claimed)
 */
export const getCurrentClaim = async (ticketId: number): Promise<any> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      claimedById: true,
      claimedBy: true,
      status: true,
    },
  });

  if (!ticket || !ticket.claimedById || ticket.status !== TicketStatus.CLAIMED) {
    return null;
  }

  return {
    claimedById: ticket.claimedById,
    claimedBy: ticket.claimedBy,
  };
};

/**
 * Get ticket lifecycle history
 */
export const getLifecycleHistory = async (ticketId: number): Promise<any[]> => {
  const events = await prisma.ticketLifecycleEvent.findMany({
    where: { ticketId },
    orderBy: { timestamp: "desc" },
    include: {
      performedBy: true,
      claimedBy: true,
      closedBy: true,
    },
  });

  return events.map((event: any) => ({
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    action: event.action,
    details: event.details,
    performedBy: event.performedBy ? {
      id: event.performedBy.id,
      username: event.performedBy.username,
      global_name: event.performedBy.username,
    } : null,
    claimedBy: event.claimedBy ? {
      id: event.claimedBy.id,
      username: event.claimedBy.username,
    } : null,
    closedBy: event.closedBy ? {
      id: event.closedBy.id,
      username: event.closedBy.username,
    } : null,
  }));
};
