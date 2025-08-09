import { createModalHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import type { ModalSubmitInteraction, TextChannel } from "discord.js";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { getSettingsUnchecked } from "@ticketsbot/core/domains/guild";
import { parseDiscordId } from "@ticketsbot/core";
import { err, ok, createModalErrorHandler, ErrorResponses } from "@bot/lib/discord-utils";
import { ChannelOps, MessageOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";
import { prisma } from "@ticketsbot/db";

const closeReasonModalHandler = createModalHandler({
  pattern: "close_reason_modal",

  handler: async (interaction: ModalSubmitInteraction) => {
    if (!interaction.channel || !interaction.guild || !interaction.channelId) {
      return err("No channel or guild");
    }

    const ticket = await Ticket.findByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply(ErrorResponses.notTicketChannel());
      return err("Not a ticket channel");
    }

    const reason = interaction.fields.getTextInputValue("close_reason") || undefined;

    // Create close embed with reason
    const embed = MessageOps.ticket.closedEmbed(interaction.user.id, ticket.id);
    if (reason) {
      embed.addFields({ name: "Reason", value: reason, inline: false });
    }

    await interaction.reply({ embeds: [embed] });

    const guild = interaction.guild;
    const userId = interaction.user.id;

    try {
      // Close ticket in transaction
      await prisma.$transaction(async (tx) => {
        // Close ticket using lifecycle domain
        await TicketLifecycle.close({
          ticketId: ticket.id,
          closedById: userId,
          reason,
          deleteChannel: false,
          notifyOpener: true,
        });
      });

      // Get guild settings
      const settings = await getSettingsUnchecked(guild.id);
      if (!settings) {
        throw new Error("Guild not properly configured");
      }

      // Discord operations after transaction
      try {
        const channel = interaction.channel as TextChannel;

        // Archive or delete the channel
        const _archiveResult = await ChannelOps.ticket.archive(
          channel,
          guild,
          settings,
          userId
        );
      } catch (error) {
        container.logger.error("Error in Discord operations:", error);
      }

      return ok(undefined);
    } catch (error) {
      container.logger.error("Failed to close ticket with reason:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to close ticket";
      return err(errorMessage);
    }
  },

  errorHandler: createModalErrorHandler("close reason modal handler"),
});

export const CloseReasonModalHandler = createInteractionHandler("CloseReasonModal", [
  closeReasonModalHandler,
]);
