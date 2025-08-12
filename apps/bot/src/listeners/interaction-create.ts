import { ListenerFactory } from "@bot/lib/sapphire";
import { container } from "@sapphire/framework";
import type { Interaction } from "discord.js";
import { db } from "@ticketsbot/db";
import { InteractionResponse } from "@bot/lib/utils/responses";
import { canReply } from "@bot/lib/utils/error-handlers";

export const InteractionCreateListener = ListenerFactory.on(
  "interactionCreate",
  async (interaction: Interaction) => {
    if (
      interaction.isChatInputCommand() ||
      interaction.isButton() ||
      interaction.isModalSubmit() ||
      interaction.isStringSelectMenu()
    ) {
      try {
        if (interaction.guild) {
          await db.guild.ensureGuild(interaction.guild.id, interaction.guild.name);
        }

        await db.discordUser.ensureDiscordUser(
          interaction.user.id,
          interaction.user.username,
          interaction.user.discriminator,
          interaction.user.displayAvatarURL()
        );
      } catch (error) {
        container.logger.error("Error ensuring user/guild exists:", error);
        if (canReply(interaction)) {
          try {
            await InteractionResponse.unexpectedError(interaction);
          } catch (replyError) {
            container.logger.error("Failed to send error response:", replyError);
          }
        }
        return; // Don't continue if we can't ensure user/guild
      }
    }

    // Let Sapphire handle the interaction routing
    // - Commands are handled by Command classes (with BaseCommand providing context)
    // - Buttons are handled by Button InteractionHandlers (with BaseButtonHandler providing context)
    // - Modals are handled by Modal InteractionHandlers (with BaseModalHandler providing context)
    // - Select menus are handled by SelectMenu InteractionHandlers (with BaseSelectMenuHandler providing context)
    // - Autocomplete is handled by Command classes
  }
);
