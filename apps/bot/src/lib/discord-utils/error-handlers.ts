import type { Interaction } from "discord.js";
import { container } from "@sapphire/framework";

/**
 * Checks if an error is due to a Discord channel being deleted
 */
export const isChannelDeletedError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "code" in error) {
    const errorCode = (error as { code: number }).code;
    return errorCode === 10003; // Unknown Channel
  }
  return false;
};

/**
 * Checks if an interaction can be replied to
 */
export const canReply = (interaction: Interaction): interaction is Interaction & {
  reply: (options: any) => Promise<any>;
  replied: boolean;
  deferred: boolean;
} => {
  return (
    "reply" in interaction &&
    "replied" in interaction &&
    "deferred" in interaction &&
    typeof interaction.reply === "function"
  );
};

/**
 * Creates a standardized error handler for button interactions
 */
export const createButtonErrorHandler = (handlerName: string) => {
  return async (interaction: Interaction, error: string | unknown) => {
    // Log the error
    container.logger.error(`Error in ${handlerName}:`, error);

    // Check if error is due to channel being deleted
    if (isChannelDeletedError(error)) {
      container.logger.debug("Channel was deleted - skipping error response");
      return;
    }

    // Send error response if possible
    if (canReply(interaction) && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ There was an error processing your request.",
          ephemeral: true,
        });
      } catch (replyError) {
        container.logger.error(`Failed to send error response in ${handlerName}:`, replyError);
      }
    }
  };
};

/**
 * Creates a standardized error handler for modal interactions
 */
export const createModalErrorHandler = (handlerName: string) => {
  return async (interaction: Interaction, error: string | unknown) => {
    // Log the error
    container.logger.error(`Error in ${handlerName}:`, error);

    // Check if error is due to channel being deleted
    if (isChannelDeletedError(error)) {
      container.logger.debug("Channel was deleted - skipping error response");
      return;
    }

    // Send error response if possible
    if (canReply(interaction) && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ There was an error processing your submission.",
          ephemeral: true,
        });
      } catch (replyError) {
        container.logger.error(`Failed to send error response in ${handlerName}:`, replyError);
      }
    }
  };
};

/**
 * Creates a standardized error handler for select menu interactions
 */
export const createSelectErrorHandler = (handlerName: string) => {
  return async (interaction: Interaction, error: string | unknown) => {
    // Log the error
    container.logger.error(`Error in ${handlerName}:`, error);

    // Check if error is due to channel being deleted
    if (isChannelDeletedError(error)) {
      container.logger.debug("Channel was deleted - skipping error response");
      return;
    }

    // Send error response if possible
    if (canReply(interaction) && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ There was an error processing your selection.",
          ephemeral: true,
        });
      } catch (replyError) {
        container.logger.error(`Failed to send error response in ${handlerName}:`, replyError);
      }
    }
  };
};

/**
 * Standard error responses for common scenarios
 */
export const ErrorResponses = {
  notTicketChannel: () => ({
    content: "❌ This is not an active ticket channel.",
    ephemeral: true,
  }),

  ticketAlreadyClaimed: (claimedById: string) => ({
    content: `❌ This ticket is already claimed by <@${claimedById}>.`,
    ephemeral: true,
  }),

  invalidCloseRequest: () => ({
    content: "❌ This close request is no longer valid.",
    ephemeral: true,
  }),

  notTicketOpener: (action: string) => ({
    content: `❌ Only the ticket opener can ${action} closure.`,
    ephemeral: true,
  }),

  invalidRating: () => ({
    content: "❌ Invalid rating value.",
    ephemeral: true,
  }),

  genericError: () => ({
    content: "❌ There was an error processing your request.",
    ephemeral: true,
  }),
} as const;

/**
 * Standard error messages for preconditions
 */
export const PreconditionErrors = {
  guildOnly: "❌ This command can only be used in a server.",
  notInChannel: "❌ This command can only be used in a channel.",
  adminOnly: "❌ You need admin permissions to use this command.",
  teamOnly: "❌ You need team member permissions to use this command.",
  ticketChannelOnly: "❌ This command can only be used in a ticket channel.",
  notTicketChannel: "❌ This is not an active ticket channel.",
  cannotCloseTicket: "❌ You do not have permission to close this ticket.",
  missingPermission: (permissionNames: string[]) => 
    `❌ You need the following permission(s) to use this command: ${permissionNames.join(", ")}`,
} as const;