import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { err, ok, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";
import type { ButtonInteraction } from "discord.js";
import { Panel } from "@ticketsbot/core/domains/panel";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { getSettingsUnchecked } from "@ticketsbot/core/domains/guild";
import { PanelOps, ChannelOps, MessageOps, TranscriptOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";
import { prisma } from "@ticketsbot/db";

const PANEL_CREATE_PATTERN = /^create_ticket_(\d+)$/;

const panelCreateHandler = createButtonHandler({
  pattern: PANEL_CREATE_PATTERN,

  handler: async (interaction: ButtonInteraction) => {
    const idMatch = interaction.customId.match(PANEL_CREATE_PATTERN);
    if (!idMatch || !idMatch[1]) return err("Invalid panel create button ID");

    const panelId = parseInt(idMatch[1]);
    if (isNaN(panelId)) return err("Invalid numeric panel ID");

    if (!interaction.guild) return err("No guild");

    container.logger.debug(`Handling panel button click: ${interaction.customId}`);

    // Get panel with form
    const panel = await Panel.getWithForm(panelId);
    if (!panel) {
      await interaction.reply({
        content: "❌ Panel not found.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Panel not found");
    }

    // Show form modal if panel has fields
    if (panel.form && panel.form.formFields.length > 0) {
      const modal = PanelOps.modal.create(panelId, panel.title, panel.form.formFields);
      await interaction.showModal(modal);
      return ok(undefined);
    }

    // No form - create ticket directly
    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    const guild = interaction.guild;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      let channel: any;

      // Create ticket in transaction
      const ticket = await prisma.$transaction(async (_tx) => {
        // Create ticket using lifecycle domain
        return await TicketLifecycle.create({
          guildId: guild.id,
          channelId: "", // Will be updated after channel creation
          openerId: userId,
          subject: panel.title,
          panelId,
          metadata: {
            createdVia: "discord",
            username,
          },
        });
      });

      // Get guild settings
      const settings = await getSettingsUnchecked(guild.id);
      if (!settings) {
        throw new Error("Guild not properly configured");
      }

      // Discord operations after transaction
      try {
        // Create Discord channel
        channel = await ChannelOps.ticket.createWithPermissions(
          guild,
          {
            id: ticket.id,
            number: ticket.number,
            openerId: ticket.openerId,
            subject: ticket.subject,
          },
          panel
        );

        // Update ticket with channel ID
        await Ticket.updateChannelId(ticket.id, channel.id);

        // Get ticket with form responses
        const ticketWithDetails = await Ticket.getById(ticket.id);

        // Send welcome message
        const welcomeEmbed = MessageOps.ticket.welcomeEmbed(ticketWithDetails, panel);
        const actionButtons = MessageOps.ticket.actionButtons(settings.showClaimButton);

        const welcomeMessage = await channel.send({
          embeds: [welcomeEmbed],
          components: [actionButtons.toJSON()],
        });

        // Store welcome message in transcript
        await TranscriptOps.store.botMessage(welcomeMessage, { id: ticket.id });
      } catch (error) {
        container.logger.error("Error in Discord operations:", error);
      }

      await interaction.editReply({
        content: `✅ Your ${panel.title.toLowerCase()} ticket has been created! Please check your ticket channel.`,
      });

      return ok({ ticketId: ticket.id });
    } catch (error) {
      container.logger.error("Error creating ticket from panel:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create ticket";
      await interaction.editReply({
        content: `❌ ${errorMessage}`,
      });
      return err(errorMessage);
    }
  },

  errorHandler: async (interaction, error: string) => {
    container.logger.error("Error in panel create button handler:", error);
    if ("reply" in interaction) {
      await interaction.reply({
        content: "❌ An error occurred while processing your request.",
        flags: EPHEMERAL_FLAG,
      });
    }
  },
});

export const PanelCreateButtonHandler = createInteractionHandler("PanelCreateButton", [
  panelCreateHandler,
]);
