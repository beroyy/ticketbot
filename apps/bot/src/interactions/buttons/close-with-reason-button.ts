import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ButtonInteraction,
  type Interaction,
} from "discord.js";
import { findByChannelId } from "@ticketsbot/core/domains/ticket";
import { parseDiscordId } from "@ticketsbot/core";
import { err, ok, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";
import { container } from "@sapphire/framework";

const closeWithReasonHandler = createButtonHandler({
  pattern: "ticket_close_with_reason",

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel) return err("No channel");

    const ticket = await findByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply({
        content: "❌ This is not an active ticket channel.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Not a ticket channel");
    }

    // Create modal
    const modal = new ModalBuilder().setCustomId("close_reason_modal").setTitle("Close Ticket");

    const reasonInput = new TextInputBuilder()
      .setCustomId("close_reason")
      .setLabel("Reason")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Reason for closing the ticket")
      .setMaxLength(200)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));

    await interaction.showModal(modal);
    return ok(undefined);
  },

  errorHandler: async (interaction: Interaction, error: string) => {
    container.logger.error("Error in close with reason button handler:", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "There was an error processing your request.",
        flags: EPHEMERAL_FLAG,
      });
    }
  },
});

export const CloseWithReasonButtonHandler = createInteractionHandler("CloseWithReasonButton", [
  closeWithReasonHandler,
]);
