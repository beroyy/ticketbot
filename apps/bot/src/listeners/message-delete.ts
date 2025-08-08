import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import type { Message, PartialMessage } from "discord.js";
import { TranscriptOps } from "@bot/lib/discord-operations";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { container } from "@sapphire/framework";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";

export const MessageDeleteListener = ListenerFactory.on(
  "messageDelete",
  async (message: Message | PartialMessage) => {
    // Skip system messages
    if (message.system) return;

    // Skip DMs
    if (!message.guild) return;

    try {
      // Check if this is a ticket channel
      const ticket = await Ticket.findByChannelId(message.channelId);
      if (!ticket || ticket.status === "CLOSED") return;

      const actor: DiscordActor = {
        type: "discord_user",
        properties: {
          userId: message.client.user.id,
          username: message.client.user.username,
          guildId: message.guildId!,
          permissions: 0n,
        },
      };

      await Actor.Context.provideAsync(actor, async () => {
        // Mark the message as deleted in our transcript
        // We handle both bot and user message deletions
        await TranscriptOps.delete(message.id);
      });
    } catch (error) {
      container.logger.error(`Failed to delete message in ticket ${message.channelId}:`, error);
    }
  }
);
