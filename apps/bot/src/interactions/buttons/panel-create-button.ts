import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire";
import { err, ok, EPHEMERAL_FLAG } from "@bot/lib/utils";
import type { ButtonInteraction } from "discord.js";
import { db } from "@ticketsbot/db";
import { bot } from "@bot/lib/bot";
import { container } from "@sapphire/framework";

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

    const panel = await db.panel.getPanelWithForm(panelId);
    if (!panel) {
      await interaction.reply({
        content: "❌ Panel not found.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Panel not found");
    }

    if (panel.form && panel.form.formFields.length > 0) {
      const modal = bot.panel.modal.create(panelId, panel.title, panel.form.formFields);
      await interaction.showModal(modal);
      return ok(undefined);
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    const guild = interaction.guild;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      let channel: any;

      const ticket = await db.ticket.create({
        guildId: guild.id,
        channelId: "", // is updated after channel creation
        openerId: userId,
        subject: panel.title,
        panelId,
        metadata: {
          createdVia: "discord",
          username,
        },
      });

      const settings = await db.guild.getGuildSettings(guild.id);
      if (!settings) {
        throw new Error("Guild not properly configured");
      }

      try {
        channel = await bot.channel.ticket.createWithPermissions(
          guild,
          {
            id: ticket.id,
            number: ticket.number,
            openerId: ticket.openerId,
            subject: ticket.subject,
          },
          panel
        );

        await db.ticket.updateChannelId(ticket.id, channel.id);

        const ticketWithDetails = await db.ticket.getById(ticket.id);

        const welcomeEmbed = bot.message.ticket.welcomeEmbed(ticketWithDetails, panel);
        const actionButtons = bot.message.ticket.actionButtons(settings.showClaimButton);

        const welcomeMessage = await channel.send({
          embeds: [welcomeEmbed],
          components: [actionButtons.toJSON()],
        });

        await bot.transcript.store.botMessage(welcomeMessage, { id: ticket.id });
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
