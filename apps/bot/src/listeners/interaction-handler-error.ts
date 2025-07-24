import { createSapphireListener } from "@bot/lib/sapphire-extensions";
import { Events, container } from "@sapphire/framework";
import { InteractionResponse } from "@bot/lib/discord-utils/responses";
import { canReply, isChannelDeletedError } from "@bot/lib/discord-utils/error-handlers";
import type { InteractionHandlerError } from "@sapphire/framework";

export const InteractionHandlerErrorListener = createSapphireListener(
  Events.InteractionHandlerError,
  async (...args: unknown[]) => {
    const [error, payload] = args as [Error, InteractionHandlerError];
    const { interaction, handler } = payload;

    // Log the error with context
    container.logger.error(`Error in ${handler.name}:`, error);

    // Skip error response if channel was deleted
    if (isChannelDeletedError(error)) {
      container.logger.debug("Channel was deleted - skipping error response");
      return;
    }

    // Send user-friendly error message using InteractionResponse
    if (canReply(interaction)) {
      try {
        // InteractionResponse expects specific interaction types
        await InteractionResponse.unexpectedError(interaction as any);
      } catch (replyError) {
        container.logger.error("Failed to send error response:", replyError);
      }
    }
  }
);
