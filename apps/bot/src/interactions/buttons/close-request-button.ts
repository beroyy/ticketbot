import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { bot } from "@bot/lib/discord-operations";
import {
  err,
  ok,
  createButtonErrorHandler,
  ErrorResponses,
  EPHEMERAL_FLAG,
} from "@bot/lib/discord-utils";
import type { ButtonInteraction, TextChannel } from "discord.js";
import { db } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";

const closeRequestPattern = /^close_(confirm|cancel)(?:_(.+))?$/;

const closeRequestHandler = createButtonHandler({
  pattern: closeRequestPattern,

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel || !interaction.guild) return err("No channel or guild");

    const match = interaction.customId.match(closeRequestPattern);
    if (!match) return err("Invalid pattern match");

    const action = match[1] as "confirm" | "cancel";
    const requestId = match[2] || null;

    const ticket = await db.ticket.getByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply(ErrorResponses.notTicketChannel());
      return err("Not a ticket channel");
    }

    if (interaction.user.id !== ticket.openerId.toString()) {
      await interaction.reply(ErrorResponses.notTicketOpener(action));
      return err("Not ticket opener");
    }

    if (requestId && ticket.closeRequestId !== requestId) {
      await interaction.reply({
        content: "❌ This close request is no longer valid.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Invalid close request");
    }

    await db.discordUser.ensureDiscordUser(
      parseDiscordId(interaction.user.id),
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    if (action === "confirm") {
      // Approved - close ticket
      const closeEmbed = bot.message.closeRequest.approvedEmbed(ticket.id);

      await interaction.update({
        embeds: [closeEmbed],
        components: [],
      });

      const guild = interaction.guild;
      const userId = interaction.user.id;

      try {
        await db.ticket.close({
          ticketId: ticket.id,
          closedById: userId,
          reason: "Close request approved by opener",
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
      } catch (error) {
        container.logger.error("Failed to close ticket:", error);
      }
    } else {
      try {
        await db.ticket.cancelCloseRequest(ticket.id, parseDiscordId(interaction.user.id));

        await interaction.update({
          content: bot.message.closeRequest.deniedMessage(),
          embeds: [],
          components: [],
        });
      } catch (error) {
        container.logger.error("Failed to cancel close request:", error);
        await interaction.reply({
          content: "❌ Failed to cancel the close request.",
          flags: EPHEMERAL_FLAG,
        });
        return err("Failed to cancel close request");
      }
    }

    return ok(undefined);
  },

  errorHandler: createButtonErrorHandler("close request button handler"),
});

export const CloseRequestButtonHandler = createInteractionHandler("CloseRequestButton", [
  closeRequestHandler,
]);
