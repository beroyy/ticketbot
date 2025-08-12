import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire";
import { bot } from "@bot/lib/bot";
import { err, ok, EPHEMERAL_FLAG } from "@bot/lib/utils";
import type { ButtonInteraction, Interaction, TextChannel } from "discord.js";
import { db } from "@ticketsbot/db";
import { container } from "@sapphire/framework";

const closeConfirmHandler = createButtonHandler({
  pattern: "ticket_close_confirm",

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel || !interaction.guild) return err("No channel or guild");

    const ticket = await db.ticket.getByChannelId(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        content: "❌ This is not an active ticket channel.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Not a ticket channel");
    }

    await db.discordUser.ensureDiscordUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    // Update with closing status
    const embed = bot.message.ticket.closedEmbed(interaction.user.id, ticket.id);
    await interaction.update({
      embeds: [embed],
      components: [],
    });

    const guild = interaction.guild;
    const userId = interaction.user.id;

    try {
      // Close ticket using domain method
      await db.ticket.close({
        ticketId: ticket.id,
        closedById: userId,
        deleteChannel: false,
        notifyOpener: true,
      });

      const settings = await db.guild.getGuildSettings(guild.id);
      if (!settings) {
        throw new Error("Guild not properly configured");
      }

      // Discord operations after transaction
      try {
        const channel = interaction.channel as TextChannel;

        // Archive or delete the channel
        const _archiveResult = await bot.channel.ticket.archive(channel, guild, settings, userId);
      } catch (error) {
        container.logger.error("Error in Discord operations:", error);
      }

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
