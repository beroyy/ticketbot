import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import type { Message } from "discord.js";
import { TranscriptOps } from "@bot/lib/discord-operations";

export const MessageCreateListener = ListenerFactory.on(
  "messageCreate",
  async (message: Message) => {
    // Skip system messages but allow bot messages if they're important
    if (message.system) return;

    // Skip DMs
    if (!message.guild) return;

    // Skip bot messages (they should be manually stored using storeBotMessage)
    // This prevents duplicate storage since we manually store important bot messages
    if (message.author.bot) return;

    // Store the message for transcript purposes
    await TranscriptOps.store.userMessage(message);
  }
);
