import { createSapphireListener } from "@bot/lib/sapphire";
import { Events, container } from "@sapphire/framework";
import { InteractionResponse } from "@bot/lib/utils/responses";
import { canReply, isChannelDeletedError } from "@bot/lib/utils/error-handlers";
import type { Command } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";

export const CommandErrorListener = createSapphireListener(
  Events.ChatInputCommandError,
  async (...args: unknown[]) => {
    const [error, payload] = args as [
      Error,
      { command: Command; interaction: ChatInputCommandInteraction },
    ];
    const { command, interaction } = payload;

    // Log the error
    container.logger.error(`Command ${command.name} errored:`, error);

    // Skip error response if channel was deleted
    if (isChannelDeletedError(error)) {
      container.logger.debug("Channel was deleted - skipping error response");
      return;
    }

    // Send user-friendly error message using InteractionResponse
    if (canReply(interaction)) {
      try {
        await InteractionResponse.unexpectedError(interaction);
      } catch (replyError) {
        container.logger.error("Failed to send error response:", replyError);
      }
    }
  }
);
