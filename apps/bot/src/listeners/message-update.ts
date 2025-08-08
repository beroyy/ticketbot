import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Message, PartialMessage } from "discord.js";
import { TranscriptOps } from "@bot/lib/discord-operations";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";

export const MessageUpdateListener = ListenerFactory.on(
  "messageUpdate",
  async (_oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
    // Skip system messages
    if (newMessage.system) return;

    // Skip DMs
    if (!newMessage.guild) return;

    // Skip if message is partial and we can't get the content
    if (newMessage.partial) {
      try {
        await newMessage.fetch();
      } catch (error) {
        container.logger.error("Failed to fetch partial message:", error);
        return;
      }
    }

    try {
      // Check if this is a ticket channel
      const ticket = await Ticket.findByChannelId(newMessage.channelId);
      if (!ticket || ticket.status === "CLOSED") return;

      const actor: DiscordActor = {
        type: "discord_user",
        properties: {
          userId: newMessage.client.user.id,
          username: newMessage.client.user.username,
          guildId: newMessage.guildId!,
          permissions: 0n,
        },
      };

      await Actor.Context.provideAsync(actor, async () => {
        // Update the stored message in transcript
        // We update both bot and user messages
        await TranscriptOps.update(newMessage.id, newMessage.content || "", newMessage.embeds);
      });
    } catch (error) {
      container.logger.error(`Failed to update message in ticket ${newMessage.channelId}:`, error);
    }
  }
);
