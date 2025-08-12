import { createCommand } from "@bot/lib/sapphire";
import { Embed, InteractionResponse, err, ok, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";
import { parseDiscordId } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";
import { container } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";

const formatTagPreview = (content: string, maxLength = 100) =>
  content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;

export const ManageTagsCommand = createCommand({
  name: "managetags",
  description: "Manage tag responses for quick replies",
  preconditions: ["guild-only", "team-only"],

  options: (builder) =>
    builder
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add")
          .setDescription("Create a new tag")
          .addStringOption((option) =>
            option
              .setName("name")
              .setDescription("The name of the tag")
              .setMaxLength(32)
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("content")
              .setDescription("The content of the tag response")
              .setMaxLength(2000)
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("delete")
          .setDescription("Delete an existing tag")
          .addIntegerOption((option) =>
            option
              .setName("tag_id")
              .setDescription("The ID of the tag to delete")
              .setMinValue(1)
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("list").setDescription("List all available tags")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("edit")
          .setDescription("Edit an existing tag")
          .addIntegerOption((option) =>
            option
              .setName("tag_id")
              .setDescription("The ID of the tag to edit")
              .setMinValue(1)
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("name")
              .setDescription("New name for the tag")
              .setMaxLength(32)
              .setRequired(false)
          )
          .addStringOption((option) =>
            option
              .setName("content")
              .setDescription("New content for the tag")
              .setMaxLength(2000)
              .setRequired(false)
          )
      ),

  execute: async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "add":
        return handleAddTag(interaction);
      case "delete":
        return handleDeleteTag(interaction);
      case "list":
        return handleListTags(interaction);
      case "edit":
        return handleEditTag(interaction);
      default:
        return err("Invalid subcommand");
    }
  },
});

const handleAddTag = async (interaction: ChatInputCommandInteraction) => {
  const name = interaction.options.getString("name", true);
  const content = interaction.options.getString("content", true);
  const guildId = parseDiscordId(interaction.guild!.id);

  try {
    const newTag = await db.tag.createTag({ guildId, name, content });

    const embed = Embed.success(
      "Tag Created",
      `Tag **${name}** has been created successfully.

**Tag ID:** ${newTag.id}
**Name:** ${name}
**Content Preview:** ${formatTagPreview(content)}

Use \`/tag ${newTag.id}\` to send this tag.`
    );

    await InteractionResponse.reply(interaction, { embeds: [embed] });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error creating tag:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      await InteractionResponse.error(interaction, error.message);
      return err(error.message);
    }

    await InteractionResponse.error(interaction, "An error occurred while creating the tag.");
    return err("Failed to create tag");
  }
};

const handleDeleteTag = async (interaction: ChatInputCommandInteraction) => {
  const tagId = interaction.options.getInteger("tag_id", true);
  const guildId = parseDiscordId(interaction.guild!.id);

  try {
    // Get tag details before deletion
    const tag = await db.tag.getTag(tagId, guildId);
    if (!tag) {
      await InteractionResponse.error(interaction, `Tag with ID ${tagId} not found.`);
      return err("Tag not found");
    }

    // Delete the tag
    await db.tag.deleteTag(tagId, guildId);

    const embed = Embed.success(
      "Tag Deleted",
      `Tag **${tag.name}** (ID: ${tagId}) has been deleted successfully.`
    );

    await InteractionResponse.reply(interaction, { embeds: [embed] });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error deleting tag:", error);
    await InteractionResponse.error(interaction, "An error occurred while deleting the tag.");
    return err("Failed to delete tag");
  }
};

const handleListTags = async (interaction: ChatInputCommandInteraction) => {
  const guildId = parseDiscordId(interaction.guild!.id);

  try {
    const tags = await db.tag.listTags(guildId, {
      orderBy: "id",
      order: "asc",
    });

    if (tags.length === 0) {
      const embed = Embed.info(
        "No Tags Found",
        "No tags have been created yet.\n\nUse `/managetags add` to create your first tag."
      );
      await InteractionResponse.reply(interaction, { embeds: [embed], flags: EPHEMERAL_FLAG });
      return ok(undefined);
    }

    const maxTagsPerPage = 10;
    const displayTags = tags.slice(0, maxTagsPerPage);

    const tagList = displayTags
      .map((tag) => {
        const preview = formatTagPreview(tag.content, 50);
        return `**ID ${tag.id}:** ${tag.name}\n\`${preview}\``;
      })
      .join("\n\n");

    const embed = Embed.info(
      "Tags List",
      `Here are all the available tags for this server:\n\n${tagList}`
    ).setFooter({
      text: `Showing ${displayTags.length} of ${tags.length} tag(s) • Use /tag <id> to send a tag`,
    });

    await InteractionResponse.reply(interaction, { embeds: [embed], flags: EPHEMERAL_FLAG });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error listing tags:", error);
    await InteractionResponse.error(
      interaction,
      "An error occurred while retrieving the tags list."
    );
    return err("Failed to list tags");
  }
};

const handleEditTag = async (interaction: ChatInputCommandInteraction) => {
  const tagId = interaction.options.getInteger("tag_id", true);
  const newName = interaction.options.getString("name");
  const newContent = interaction.options.getString("content");
  const guildId = parseDiscordId(interaction.guild!.id);

  if (!newName && !newContent) {
    await InteractionResponse.error(
      interaction,
      "Please specify either a new name or new content to edit."
    );
    return err("No changes specified");
  }

  try {
    const updatedTag = await db.tag.updateTag(tagId, guildId, {
      ...(newName && { name: newName }),
      ...(newContent && { content: newContent }),
    });

    const changes = [
      newName && `**New Name:** ${newName}`,
      newContent && `**New Content Preview:** ${formatTagPreview(newContent)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const embed = Embed.success(
      "Tag Updated",
      `Tag **${updatedTag.name}** (ID: ${tagId}) has been updated successfully.\n\n${changes}`
    );

    await InteractionResponse.reply(interaction, { embeds: [embed] });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error editing tag:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("already exists")) {
        await InteractionResponse.error(interaction, error.message);
        return err(error.message);
      }
    }

    await InteractionResponse.error(interaction, "An error occurred while editing the tag.");
    return err("Failed to edit tag");
  }
};
