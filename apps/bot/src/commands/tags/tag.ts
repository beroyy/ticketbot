import { createCommand } from "@bot/lib/sapphire-extensions";
import { InteractionResponse, err, ok } from "@bot/lib/discord-utils";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";
import { db } from "@ticketsbot/db";

export const TagCommand = createCommand({
  name: "tag",
  description: "Send a tag response",
  preconditions: ["guild-only", "team-only"],

  options: (builder) =>
    builder
      .addIntegerOption((option) =>
        option
          .setName("tag_id")
          .setDescription("The ID of the tag to send")
          .setMinValue(1)
          .setRequired(true)
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("Mention a specific user with the tag")
          .setRequired(false)
      ),

  execute: async (interaction) => {
    const tagId = interaction.options.getInteger("tag_id", true);
    const mentionUser = interaction.options.getUser("user");
    const guild = interaction.guild!;
    const guildId = parseDiscordId(guild.id);

    try {
      const tag = await db.tag.getTag(tagId, guildId);

      if (!tag) {
        await InteractionResponse.error(interaction, `Tag with ID ${tagId} not found.`);
        return err("Tag not found");
      }

      // Prepare message content
      const messageContent = mentionUser ? `<@${mentionUser.id}> ${tag.content}` : tag.content;

      // Send tag publicly
      await interaction.reply({
        content: messageContent,
        allowedMentions: {
          users: mentionUser ? [mentionUser.id] : [],
          roles: [],
        },
      });

      // Log usage
      container.logger.info(
        `Tag ${tagId} (${tag.name}) used by ${interaction.user.tag} in ${guild.name}`
      );

      return ok(undefined);
    } catch (error) {
      container.logger.error("Error sending tag:", error);
      await InteractionResponse.error(interaction, "An error occurred while sending the tag.");
      return err("Failed to send tag");
    }
  },
});
