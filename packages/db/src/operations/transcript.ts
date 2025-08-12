import { prisma } from "../client";

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

/**
 * Record a Discord message in a ticket transcript
 * Handles user creation, transcript creation, and message storage in a transaction
 * Used by message-create listener
 */
export const recordMessage = async (data: {
  ticketId: number;
  messageId: string;
  authorId: string;
  authorData: {
    username: string;
    discriminator: string;
    avatarUrl: string;
    bot: boolean;
  };
  content: string;
  embeds?: any[];
  attachments?: Map<string, any>;
  referenceId?: string | null;
}): Promise<void> => {
  // Helper to serialize embeds
  const serializeEmbeds = (embeds: any[]) =>
    embeds && embeds.length > 0 ? JSON.stringify(embeds.map((embed) => embed.toJSON())) : null;

  // Helper to serialize attachments
  const serializeAttachments = (attachments: Map<string, any>) =>
    attachments && attachments.size > 0
      ? JSON.stringify(
          Array.from(attachments.values()).map((attachment) => ({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            size: attachment.size,
            contentType: attachment.contentType,
          }))
        )
      : null;

  await prisma.$transaction(async (tx) => {
    // 1. Ensure user exists
    await tx.discordUser.upsert({
      where: { id: data.authorId },
      update: {
        username: data.authorData.username,
        discriminator: data.authorData.discriminator,
        avatarUrl: data.authorData.avatarUrl,
      },
      create: {
        id: data.authorId,
        username: data.authorData.username,
        discriminator: data.authorData.discriminator,
        avatarUrl: data.authorData.avatarUrl,
      },
    });

    // 2. Get or create transcript
    let transcript = await tx.transcript.findUnique({
      where: { ticketId: data.ticketId },
    });

    if (!transcript) {
      transcript = await tx.transcript.create({
        data: {
          ticketId: data.ticketId,
        },
      });
    }

    // 3. Store message in transcript
    await tx.ticketMessage.upsert({
      where: { messageId: data.messageId },
      update: {
        content: data.content || "",
        embeds: data.embeds ? serializeEmbeds(data.embeds) : null,
        attachments: data.attachments ? serializeAttachments(data.attachments) : null,
        editedAt: null,
      },
      create: {
        transcriptId: transcript.id,
        messageId: data.messageId,
        authorId: data.authorId,
        content: data.content || "",
        embeds: data.embeds ? serializeEmbeds(data.embeds) : null,
        attachments: data.attachments ? serializeAttachments(data.attachments) : null,
        messageType: data.authorData.bot ? "system" : "user",
        referenceId: data.referenceId || null,
      },
    });
  });
};