import { prisma } from "../../client";

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