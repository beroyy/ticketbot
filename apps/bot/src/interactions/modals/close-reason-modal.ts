import { createModalHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import type { ModalSubmitInteraction, TextChannel } from "discord.js";
import { db } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { err, ok, createModalErrorHandler, ErrorResponses } from "@bot/lib/discord-utils";
import { bot } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";

const closeReasonModalHandler = createModalHandler({
  pattern: "close_reason_modal",

  handler: async (interaction: ModalSubmitInteraction) => {
    if (!interaction.channel || !interaction.guild || !interaction.channelId) {
      return err("No channel or guild");
    }

    const ticket = await db.ticket.getByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply(ErrorResponses.notTicketChannel());
      return err("Not a ticket channel");
    }

    const reason = interaction.fields.getTextInputValue("close_reason") || undefined;

    const embed = bot.message.ticket.closedEmbed(interaction.user.id, ticket.id);
    if (reason) {
      embed.addFields({ name: "Reason", value: reason, inline: false });
    }

    await interaction.reply({ embeds: [embed] });

    const guild = interaction.guild;
    const userId = interaction.user.id;

    try {
      await db.ticket.close({
        ticketId: ticket.id,
        closedById: userId,
        reason,
        deleteChannel: false,
        notifyOpener: true,
      });

      const settings = await db.guild.getGuildSettings(guild.id);
      if (!settings) {
        throw new Error("Guild not properly configured");
      }

      try {
        const channel = interaction.channel as TextChannel;

        const _archiveResult = await bot.channel.ticket.archive(channel, guild, settings, userId);
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
