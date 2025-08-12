import { ListenerFactory } from "@bot/lib/sapphire";
import type { Message, PartialMessage } from "discord.js";
import { bot } from "@bot/lib/bot";
import { db } from "@ticketsbot/db";
import { container } from "@sapphire/framework";
import { BotContext } from "@bot/lib/context";

export const MessageDeleteListener = ListenerFactory.on(
  "messageDelete",
  async (message: Message | PartialMessage) => {
    // Skip system messages
    if (message.system) return;

    // Skip DMs
    if (!message.guild) return;

    try {
      // Check if this is a ticket channel
      const ticket = await db.ticket.getByChannelId(message.channelId);
      if (!ticket || ticket.status === "CLOSED") return;

      const context: BotContext = {
        userId: message.client.user.id,
        username: message.client.user.username,
        guildId: message.guildId!,
        permissions: 0n,
      };

      await BotContext.provideAsync(context, async () => {
        // Mark the message as deleted in our transcript
        // We handle both bot and user message deletions
        await bot.transcript.deleteMessage(message.id);
      });
    } catch (error) {
      container.logger.error(`Failed to delete message in ticket ${message.channelId}:`, error);
    }
  }
);
