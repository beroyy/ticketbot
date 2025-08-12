import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire";
import type { ButtonInteraction } from "discord.js";
import { db } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { err, ok, createButtonErrorHandler, ErrorResponses, EPHEMERAL_FLAG } from "@bot/lib/utils";
import { bot } from "@bot/lib/bot";
import { container } from "@sapphire/framework";

const feedbackHandler = createButtonHandler({
  pattern: /^feedback_(\d+)_(\d+)$/,

  handler: async (interaction: ButtonInteraction) => {
    const match = interaction.customId.match(/^feedback_(\d+)_(\d+)$/);
    if (!match || !match[1] || !match[2]) return err("Invalid feedback button format");

    const ticketId = parseInt(match[1]);
    const rating = parseInt(match[2]);

    // Validate rating
    if (rating < 1 || rating > 5) {
      await interaction.reply(ErrorResponses.invalidRating());
      return err("Invalid rating");
    }

    await db.discordUser.ensureDiscordUser(
      parseDiscordId(interaction.user.id),
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    try {
      // Submit feedback using Transcripts domain
      await db.transcript.submitFeedback({
        ticketId,
        rating,
        submittedById: parseDiscordId(interaction.user.id),
      });

      // Update message with success embed
      const successEmbed = bot.message.feedback.successEmbed(rating);
      await interaction.update({
        embeds: [successEmbed],
        components: [],
      });

      return ok(undefined);
    } catch (error) {
      container.logger.error("Failed to submit feedback:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit feedback";

      if (errorMessage.includes("already submitted")) {
        await interaction.reply({
          content: "❌ You have already submitted feedback for this ticket.",
          flags: EPHEMERAL_FLAG,
        });
      } else {
        await interaction.reply(ErrorResponses.genericError());
      }

      return err(errorMessage);
    }
  },

  errorHandler: createButtonErrorHandler("feedback button handler"),
});

export const FeedbackButtonHandler = createInteractionHandler("FeedbackButton", [feedbackHandler]);
