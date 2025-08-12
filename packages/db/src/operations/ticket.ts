import { prisma } from "../client";
import { TicketStatus } from "..";

/**
 * Static ticket methods that don't require actor context
 * Used primarily for preconditions and system operations
 *
 * Note: Message operations have been moved to Transcripts domain
 * Auto-close operations have been moved to TicketLifecycle domain
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
