import { createSelectHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { err, ok, createSelectErrorHandler, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";
import type { StringSelectMenuInteraction } from "discord.js";
import { Panel } from "@ticketsbot/core/domains/panel";
import { PanelOps, TicketOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";

const panelSelectHandler = createSelectHandler({
  pattern: "ticket_panel_select",

  handler: async (interaction: StringSelectMenuInteraction) => {
    if (!interaction.guild) return err("No guild");

    // Extract panel ID from the selected value (format: "panel_123")
    const selectedValue = interaction.values[0];
    if (!selectedValue) return err("No value selected");

    const panelId = parseInt(selectedValue.replace("panel_", ""));

    // Get the panel with its form
    const panel = await Panel.getWithForm(panelId);
    if (!panel) {
      await interaction.reply({
        content: "❌ Panel not found.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Panel not found");
    }

    // If panel has a form, show the form modal
    if (panel.form && panel.form.formFields.length > 0) {
      const modal = PanelOps.modal.create(panelId, panel.title, panel.form.formFields);
      await interaction.showModal(modal);
      return ok(undefined);
    }

    // No form, create ticket directly
    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    try {
      // Use shared ticket creation logic
      const { ticket } = await TicketOps.createFromPanel({
        panelId,
        userId: interaction.user.id,
        username: interaction.user.username,
        guild: interaction.guild,
      });

      await interaction.editReply({
        content: `✅ Your ${panel.title.toLowerCase()} ticket #${ticket.number} has been created! Please check your ticket channel.`,
      });

      return ok({ ticketId: ticket.id });
    } catch (error) {
      container.logger.error("Error creating ticket from panel select:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create ticket";
      await interaction.editReply({
        content: `❌ ${errorMessage}`,
      });
      return err(errorMessage);
    }
  },

  errorHandler: createSelectErrorHandler("panel select menu handler"),
});

export const PanelSelectMenuHandler = createInteractionHandler("PanelSelectMenu", [
  panelSelectHandler,
]);
