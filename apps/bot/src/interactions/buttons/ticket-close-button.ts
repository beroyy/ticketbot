import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { bot } from "@bot/lib/bot";
import { err, ok, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";
import type { ButtonInteraction } from "discord.js";
import { db } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";

const ticketCloseHandler = createButtonHandler({
  pattern: "ticket_close",

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel) return err("No channel");

    const ticket = await db.ticket.getByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply({
        content: "❌ This is not an active ticket channel.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Not a ticket channel");
    }

    // Show confirmation
    const embed = bot.message.confirmation.closeEmbed();
    const button = bot.message.confirmation.closeButton();

    await interaction.reply({
      embeds: [embed],
      components: [button.toJSON()],
      flags: EPHEMERAL_FLAG,
    });

    return ok(undefined);
  },

  errorHandler: async (interaction, error: string) => {
    container.logger.error("Error in ticket close button handler:", error);

    // Check for channel deleted error
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: number }).code === 10003
    ) {
      container.logger.debug("Channel was deleted (ticket closed) - skipping error response");
      return;
    }

    if ("reply" in interaction && "replied" in interaction && "deferred" in interaction) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "There was an error processing your request.",
          flags: EPHEMERAL_FLAG,
        });
      }
    }
  },
});

export const TicketCloseButtonHandler = createInteractionHandler("TicketCloseButton", [
  ticketCloseHandler,
]);
