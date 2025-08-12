import { prisma } from "../client";
import { TicketStatus } from "..";

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
 * Get ticket lifecycle history
 */
export const getHistory = async (ticketId: number): Promise<any[]> => {
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