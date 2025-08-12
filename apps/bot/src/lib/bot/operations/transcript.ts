import type { Message } from "discord.js";
import { db } from "@ticketsbot/db";

// Helper to serialize embeds
const serializeEmbeds = (embeds: any[]) =>
  embeds.length > 0 ? JSON.stringify(embeds.map((embed) => embed.toJSON())) : null;

// Helper to serialize attachments
const serializeAttachments = (attachments: Map<string, any>) =>
  attachments.size > 0
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

// Transcript storage operations
export const store = {
  userMessage: async (message: Message) => {
    try {
      const ticket = await db.ticket.getByChannelId(message.channelId);
      if (!ticket || (ticket.status !== "OPEN" && ticket.status !== "CLAIMED")) return;

      const discordId = message.author.id;
      await db.discordUser.ensureDiscordUser(
        discordId,
        message.author.username,
        message.author.discriminator,
        message.author.displayAvatarURL()
      );

      await db.transcript.storeMessage({
        ticketId: ticket.id,
        messageId: message.id,
        authorId: discordId,
        content: message.content || "",
        embeds: serializeEmbeds(message.embeds),
        attachments: serializeAttachments(message.attachments),
        messageType: "user",
        referenceId: message.reference?.messageId ? message.reference.messageId : null,
      });
    } catch (error) {
      console.error("Error storing message:", error);
    }
  },

  botMessage: async (message: Message, ticket: { id: number }) => {
    try {
      const discordId = message.author.id;
      await db.discordUser.ensureDiscordUser(
        discordId,
        message.author.username,
        message.author.discriminator,
        message.author.displayAvatarURL()
      );

      await db.transcript.storeMessage({
        ticketId: ticket.id,
        messageId: message.id,
        authorId: discordId,
        content: message.content || "",
        embeds: serializeEmbeds(message.embeds),
        attachments: serializeAttachments(message.attachments),
        messageType: "system",
        referenceId: message.reference?.messageId ? message.reference.messageId : null,
      });
    } catch (error) {
      console.error("Error storing bot message:", error);
    }
  },
};

// Update a transcript message
export const update = async (
  messageId: string,
  newContent: string,
  newEmbeds?: Array<{ toJSON(): unknown }>
) => {
  try {
    const _embeds =
      newEmbeds && newEmbeds.length > 0
        ? JSON.stringify(newEmbeds.map((embed) => embed.toJSON()))
        : null;

    await db.transcript.updateMessage(messageId, {
      content: newContent || "",
      editedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating message:", error);
  }
};

// Delete a transcript message
export const deleteMessage = async (messageId: string) => {
  try {
    await db.transcript.deleteMessage(messageId);
  } catch (error) {
    console.error("Error deleting message:", error);
  }
};

// Generate transcript data
export const generateData = async (ticketId: number) => {
  const messages = await db.transcript.getMessages(ticketId);

  return messages.map((msg: any) => ({
    id: msg.messageId.toString(),
    content: msg.content,
    author: {
      id: msg.authorId.toString(),
      username: msg.author.username,
      discriminator: msg.author.discriminator,
      avatarUrl: msg.author.avatarUrl,
    },
    embeds: msg.embeds ? JSON.parse(msg.embeds) : [],
    attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
    messageType: msg.messageType,
    referenceId: msg.referenceId?.toString(),
    createdAt: msg.createdAt,
    editedAt: msg.editedAt,
    deletedAt: msg.deletedAt,
  }));
};
