import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { findByChannelId } from "@ticketsbot/core/domains/ticket";
import { container } from "@sapphire/framework";
import type { Message } from "discord.js";
import { prisma } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";

const ROLE_PREFIX = "Tickets ";

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

export const MessageCreateListener = ListenerFactory.on(
  "messageCreate",
  async (message: Message) => {
    if (message.system || !message.guild) return;

    try {
      // Check if this is a ticket channel
      const ticket = await findByChannelId(message.channelId);
      if (!ticket || ticket.status === "CLOSED") return;

      const messageId = parseDiscordId(message.id);
      const authorId = parseDiscordId(message.author.id);
      const guildId = message.guildId!;

      // Wrap transcript storage and event logging in transaction
      await prisma.$transaction(async (tx) => {
        // 1. Ensure user exists
        await tx.discordUser.upsert({
          where: { id: authorId },
          update: {
            username: message.author.username,
            discriminator: message.author.discriminator,
            avatarUrl: message.author.displayAvatarURL(),
          },
          create: {
            id: authorId,
            username: message.author.username,
            discriminator: message.author.discriminator,
            avatarUrl: message.author.displayAvatarURL(),
          },
        });

        // 2. Get or create transcript
        let transcript = await tx.transcript.findUnique({
          where: { ticketId: ticket.id },
        });

        if (!transcript) {
          transcript = await tx.transcript.create({
            data: {
              ticketId: ticket.id,
            },
          });
        }

        // 3. Store message in transcript
        await tx.ticketMessage.upsert({
          where: { messageId },
          update: {
            content: message.content || "",
            embeds: serializeEmbeds(message.embeds),
            attachments: serializeAttachments(message.attachments),
            editedAt: message.editedAt,
          },
          create: {
            transcriptId: transcript.id,
            messageId,
            authorId,
            content: message.content || "",
            embeds: serializeEmbeds(message.embeds),
            attachments: serializeAttachments(message.attachments),
            messageType: message.author.bot ? "system" : "user",
            referenceId: message.reference?.messageId
              ? parseDiscordId(message.reference.messageId)
              : null,
          },
        });

        // Event logging removed - TCN will handle this automatically
      });
    } catch (error) {
      container.logger.error(`Failed to handle message in ticket ${message.channelId}:`, error);
    }
  }
);