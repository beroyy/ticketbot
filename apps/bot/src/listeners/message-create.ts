import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { db } from "@ticketsbot/db";
import { container } from "@sapphire/framework";
import type { Message } from "discord.js";
import { parseDiscordId } from "@ticketsbot/core";


export const MessageCreateListener = ListenerFactory.on(
  "messageCreate",
  async (message: Message) => {
    if (message.system || !message.guild) return;

    try {
      const ticket = await db.ticket.get(message.channelId);
      if (!ticket || ticket.status === "CLOSED") return;

      const messageId = parseDiscordId(message.id);
      const authorId = parseDiscordId(message.author.id);

      // Use high-level transcript operation
      await db.transcript.recordMessage({
        ticketId: ticket.id,
        messageId,
        authorId,
        authorData: {
          username: message.author.username,
          discriminator: message.author.discriminator,
          avatarUrl: message.author.displayAvatarURL(),
          bot: message.author.bot,
        },
        content: message.content,
        embeds: message.embeds,
        attachments: message.attachments,
        referenceId: message.reference?.messageId
          ? parseDiscordId(message.reference.messageId)
          : null,
      });
    } catch (error) {
      container.logger.error(`Failed to handle message in ticket ${message.channelId}:`, error);
    }
  }
);
