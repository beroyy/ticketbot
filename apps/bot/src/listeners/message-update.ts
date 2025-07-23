import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Message, PartialMessage } from "discord.js";
import { TranscriptOps } from "@bot/lib/discord-operations";

export const MessageUpdateListener = ListenerFactory.on(
  "messageUpdate",
  async (_oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
    // Skip bot messages and system messages
    if (newMessage.author?.bot || newMessage.system) return;

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

    // Update the stored message
    await TranscriptOps.update(newMessage.id, newMessage.content || "", newMessage.embeds);
  }
);
