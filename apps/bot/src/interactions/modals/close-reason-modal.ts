import { createModalHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import type { ModalSubmitInteraction, TextChannel } from "discord.js";
import { Ticket, TicketLifecycle, getSettingsUnchecked } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { err, ok, createModalErrorHandler, ErrorResponses } from "@bot/lib/discord-utils";
import { ChannelOps, MessageOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";

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
      await withTransaction(async () => {
        // Close ticket using lifecycle domain
        await TicketLifecycle.close({
          ticketId: ticket.id,
          closedById: userId,
          reason,
          deleteChannel: false,
          notifyOpener: true,
        });

        // Get guild settings
        const settings = await getSettingsUnchecked(guild.id);
        if (!settings) {
          throw new Error("Guild not properly configured");
        }

        // Schedule Discord operations after transaction
        afterTransaction(async () => {
          try {
            const channel = interaction.channel as TextChannel;

            // Archive or delete the channel
            const archiveResult = await ChannelOps.ticket.archive(channel, guild, settings, userId);

          } catch (error) {
            container.logger.error("Error in Discord operations:", error);
          }
        });
      });

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
