import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import type { Message, PartialMessage } from "discord.js";
import { TranscriptOps } from "@bot/lib/discord-operations";

export const MessageDeleteListener = ListenerFactory.on(
  "messageDelete",
  async (message: Message | PartialMessage) => {
    // Skip bot messages and system messages
    if (message.author?.bot || message.system) return;

    // Skip DMs
    if (!message.guild) return;

    // Mark the message as deleted in our transcript
    await TranscriptOps.delete(message.id);
  }
);
