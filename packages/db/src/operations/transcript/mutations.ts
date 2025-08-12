import { prisma } from "../../client";

/**
 * Store a new ticket message
 */
export const storeMessage = async (data: {
  ticketId: number;
  messageId: string;
  authorId: string;
  content: string | null;
  embeds: any;
  attachments: any;
  messageType?: string;
  referenceId?: string | null;
}): Promise<any> => {
  // First, ensure transcript exists for this ticket
  const transcript = await prisma.transcript.upsert({
    where: { ticketId: data.ticketId },
    update: {},
    create: { ticketId: data.ticketId },
  });

  return prisma.ticketMessage.create({
    data: {
      transcriptId: transcript.id,
      messageId: data.messageId,
      authorId: data.authorId,
      content: data.content,
      embeds: data.embeds ? JSON.stringify(data.embeds) : null,
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      messageType: data.messageType || "user",
      referenceId: data.referenceId || null,
    },
  });
};

/**
 * Update an existing message
 */
export const updateMessage = async (
  messageId: string,
  data: {
    content?: string;
    editedAt?: Date;
  }
): Promise<any> => {
  return prisma.ticketMessage.update({
    where: { messageId },
    data: {
      content: data.content,
      editedAt: data.editedAt || new Date(),
    },
  });
};

/**
 * Mark a message as deleted
 */
export const deleteMessage = async (messageId: string): Promise<any> => {
  return prisma.ticketMessage.update({
    where: { messageId },
    data: { deletedAt: new Date() },
  });
};

/**
 * Add a history entry to a ticket
 */
export const addHistoryEntry = async (
  ticketId: number,
  action: string,
  performedById: string,
  details?: any
): Promise<any> => {
  // Ensure transcript exists
  const transcript = await prisma.transcript.upsert({
    where: { ticketId },
    update: {},
    create: { ticketId },
  });

  return prisma.ticketHistory.create({
    data: {
      transcriptId: transcript.id,
      action,
      performedById,
      details: details ? JSON.stringify(details) : null,
    },
  });
};

/**
 * Submit feedback for a ticket
 */
export const submitFeedback = async (data: {
  ticketId: number;
  rating: number;
  comment?: string;
  submittedById: string;
}): Promise<any> => {
  // Ensure transcript exists
  const transcript = await prisma.transcript.upsert({
    where: { ticketId: data.ticketId },
    update: {},
    create: { ticketId: data.ticketId },
  });

  return prisma.ticketFeedback.upsert({
    where: { transcriptId: transcript.id },
    update: {
      rating: data.rating,
      comment: data.comment || null,
      submittedById: data.submittedById,
      submittedAt: new Date(),
    },
    create: {
      transcriptId: transcript.id,
      rating: data.rating,
      comment: data.comment || null,
      submittedById: data.submittedById,
    },
  });
};