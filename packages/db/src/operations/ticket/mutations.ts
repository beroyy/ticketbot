import { prisma } from "../../client";

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
 * Update ticket's channel ID
 */
export const updateChannelId = async (ticketId: number, channelId: string): Promise<any> => {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { channelId },
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