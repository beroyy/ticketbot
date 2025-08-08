import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { ChannelOps, MessageOps } from "@bot/lib/discord-operations";
import { err, ok, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";
import type { ButtonInteraction, Interaction, TextChannel } from "discord.js";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { User } from "@ticketsbot/core/domains/user";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { getSettingsUnchecked } from "@ticketsbot/core/domains/guild";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";

const closeConfirmHandler = createButtonHandler({
  pattern: "ticket_close_confirm",

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel || !interaction.guild) return err("No channel or guild");

    const ticket = await Ticket.findByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply({
        content: "❌ This is not an active ticket channel.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Not a ticket channel");
    }

    await User.ensure(
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

        const settings = await getSettingsUnchecked(guild.id);
        if (!settings) {
          throw new Error("Guild not properly configured");
        }

        // Schedule Discord operations after transaction
        afterTransaction(async () => {
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
        flags: EPHEMERAL_FLAG,
      });
    }
  },
});

export const CloseConfirmButtonHandler = createInteractionHandler("CloseConfirmButton", [
  closeConfirmHandler,
]);
