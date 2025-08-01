import { err, ok, createModalErrorHandler, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";
import { createModalHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import type { ModalSubmitInteraction } from "discord.js";
import { Panel } from "@ticketsbot/core/domains";
import { TicketOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";

const PANEL_FORM_PATTERN = /^panel_form_(\d+)$/;

const panelFormModalHandler = createModalHandler({
  pattern: PANEL_FORM_PATTERN,

  handler: async (interaction: ModalSubmitInteraction) => {
    const idMatch = interaction.customId.match(PANEL_FORM_PATTERN);
    if (!idMatch || !idMatch[1]) return err("Invalid panel form ID");

    const panelId = parseInt(idMatch[1]);
    if (isNaN(panelId)) return err("Invalid numeric panel ID");

    if (!interaction.guild) return err("No guild");

    // Defer immediately
    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    container.logger.debug(`Handling form submission for panel ${panelId}`);

    // Get panel with form
    const panel = await Panel.getWithForm(panelId);
    if (!panel) {
      container.logger.error(`Panel not found with ID: ${panelId}`);
      await interaction.editReply({
        content: "❌ Panel not found.",
      });
      return err("Panel not found");
    }

    // Collect form responses using the shared helper
    const formResponses = panel.form
      ? TicketOps.parseFormResponses(interaction, panel.form.formFields)
      : [];

    try {
      // Use shared ticket creation logic
      const { ticket } = await TicketOps.createFromPanel({
        panelId,
        userId: interaction.user.id,
        username: interaction.user.username,
        guild: interaction.guild,
        formResponses,
      });

      await interaction.editReply({
        content: `✅ Your ${panel.title.toLowerCase()} ticket #${ticket.number} has been created! Please check your ticket channel.`,
      });

      return ok({ ticketId: ticket.id });
    } catch (error) {
      container.logger.error("Error creating ticket from panel form:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create ticket";
      await interaction.editReply({
        content: `❌ ${errorMessage}`,
      });
      return err(errorMessage);
    }
  },

  errorHandler: createModalErrorHandler("panel form modal handler"),
});

export const PanelFormModalHandler = createInteractionHandler("PanelFormModal", [
  panelFormModalHandler,
]);
