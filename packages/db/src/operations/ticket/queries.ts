import { prisma } from "../../client";
import { TicketStatus } from "../..";

/**
 * Find a ticket by its Discord channel ID
 * No permission checks - use carefully
 * Returns tickets of any status
 */
export const getByChannelId = async (channelId: string): Promise<any> => {
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
 * Get ticket by ID with all relations
 * Same as getByIdUnchecked but with consistent naming
 */
export const getById = async (ticketId: number): Promise<any> => {
  return getByIdUnchecked(ticketId);
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