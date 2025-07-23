import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { ChannelOps, MessageOps } from "@bot/lib/discord-operations";
import { err, ok } from "@bot/lib/discord-utils";
import type { ButtonInteraction, Interaction, TextChannel } from "discord.js";
import {
  User as UserDomain,
  Ticket,
  TicketLifecycle,
  getSettingsUnchecked,
} from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
import { captureEvent } from "@ticketsbot/core/analytics";

const closeConfirmHandler = createButtonHandler({
  pattern: "ticket_close_confirm",

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel || !interaction.guild) return err("No channel or guild");

    const ticket = await Ticket.findByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply({
        content: "❌ This is not an active ticket channel.",
        ephemeral: true,
      });
      return err("Not a ticket channel");
    }

    // Ensure user exists
    await UserDomain.ensure(
      parseDiscordId(interaction.user.id),
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    // Update with closing status
    const embed = MessageOps.ticket.closedEmbed(interaction.user.id, ticket.id);
    await interaction.update({
      embeds: [embed],
      components: [],
    });

    const guild = interaction.guild;
    const userId = interaction.user.id;

    try {
      await withTransaction(async () => {
        // Close ticket using lifecycle domain
        await TicketLifecycle.close({
          ticketId: ticket.id,
          closedById: userId,
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

            // Track event
            await captureEvent("ticket_closed", {
              ticketId: ticket.id,
              closedBy: userId,
              channelDeleted: archiveResult.deleted,
              channelArchived: archiveResult.archived,
            });
          } catch (error) {
            container.logger.error("Error in Discord operations:", error);
          }
        });
      });

      return ok(undefined);
    } catch (error) {
      container.logger.error("Failed to close ticket:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to close ticket";
      return err(errorMessage);
    }
  },

  errorHandler: async (interaction: Interaction, error: string) => {
    container.logger.error("Error in close confirm button handler:", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.followUp({
        content: `❌ ${error}`,
        ephemeral: true,
      });
    }
  },
});

export const CloseConfirmButtonHandler = createInteractionHandler("CloseConfirmButton", [
  closeConfirmHandler,
]);
