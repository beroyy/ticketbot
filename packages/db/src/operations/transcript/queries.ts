import { prisma } from "../../client";

/**
 * Get all messages for a ticket
 */
export const getMessages = async (ticketId: number): Promise<any[]> => {
  const transcript = await prisma.transcript.findUnique({
    where: { ticketId },
    include: {
      ticketMessages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: true,
        },
      },
    },
  });

  if (!transcript) return [];

  return transcript.ticketMessages.map((msg: any) => ({
    ...msg,
    embeds: msg.embeds ? JSON.parse(msg.embeds) : null,
    attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
  }));
};

/**
 * Get ticket history
 */
export const getHistory = async (ticketId: number): Promise<any[]> => {
  const transcript = await prisma.transcript.findUnique({
    where: { ticketId },
  });

  if (!transcript) return [];

  const history = await prisma.ticketHistory.findMany({
    where: { transcriptId: transcript.id },
    orderBy: { timestamp: "desc" },
    include: {
      performedBy: true,
    },
  });

  return history.map((entry: any) => ({
    ...entry,
    details: entry.details ? JSON.parse(entry.details) : null,
  }));
};