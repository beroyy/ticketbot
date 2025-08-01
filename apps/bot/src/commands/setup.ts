import { createCommandGroup } from "@bot/lib/sapphire-extensions";
import {
  InteractionResponse,
  InteractionEdit,
  Embed,
  COLORS,
  err,
  ok,
  match,
  type Result,
  EPHEMERAL_FLAG,
} from "@bot/lib/discord-utils";
import {
  Role,
  User,
  Panel,
  ensure as ensureGuild,
  update as updateGuild,
  ensureWithDefaults as ensureGuildWithDefaults,
} from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";
import { RoleOps } from "@bot/lib/discord-operations/roles";
import { ChannelOps } from "@bot/lib/discord-operations/channel";
import {
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Guild as DiscordGuild,
  type TextChannel,
  type ChatInputCommandInteraction,
  type Role as DiscordRole,
  type CategoryChannel,
} from "discord.js";

// Helper to create default roles using proper abstractions
const createDefaultRoles = async (guild: DiscordGuild) => {
  const adminRole =
    guild.roles.cache.find((r) => r.name === "Tickets Admin") ||
    (await guild.roles.create({
      name: "Tickets Admin",
      color: COLORS.SUCCESS,
      permissions: [PermissionFlagsBits.Administrator],
    }));

  const supportRole =
    guild.roles.cache.find((r) => r.name === "Tickets Support") ||
    (await guild.roles.create({
      name: "Tickets Support",
      color: COLORS.INFO,
      permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    }));

  return { adminRole, supportRole };
};

// Helper to create default categories using ChannelOps
const createDefaultCategories = async (
  guild: DiscordGuild,
  adminRole: DiscordRole,
  supportRole: DiscordRole
) => {
  const permissions = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: adminRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
      ],
    },
    {
      id: supportRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  // Use ChannelOps.utils for category creation
  const ticketsCategory = (await ChannelOps.utils.createCategoryIfNeeded(
    guild,
    "Tickets"
  )) as CategoryChannel;
  const supportCategory = (await ChannelOps.utils.createCategoryIfNeeded(
    guild,
    "Support"
  )) as CategoryChannel;

  // Apply permissions to categories
  await ticketsCategory.permissionOverwrites.set(permissions);
  await supportCategory.permissionOverwrites.set(permissions);

  return { ticketsCategory, supportCategory };
};

export const SetupCommand = createCommandGroup({
  name: "setup",
  description: "Configure ticketsbot.ai for your server",
  preconditions: ["guild-only", "admin-only"],

  subcommands: {
    auto: {
      name: "auto",
      description: "Automatically set up basic configuration",
      execute: async (interaction) => {
        const result = await handleAutoSetup(interaction);
        return match(result, {
          ok: () => ok(undefined),
          err: (error) => {
            container.logger.error("Auto setup failed:", error);
            return err(error);
          },
        });
      },
    },
    limit: {
      name: "limit",
      description: "Set the maximum number of tickets per user",
      options: (builder) =>
        builder.addIntegerOption((option) =>
          option
            .setName("number")
            .setDescription("Maximum tickets per user (0 = unlimited)")
            .setMinValue(0)
            .setMaxValue(10)
            .setRequired(true)
        ),
      execute: async (interaction) => {
        const result = await handleLimitSetup(interaction);
        return match(result, {
          ok: () => ok(undefined),
          err: (error) => {
            InteractionResponse.error(interaction, error);
            return err(error);
          },
        });
      },
    },
    transcripts: {
      name: "transcripts",
      description: "Set the channel for ticket transcripts",
      options: (builder) =>
        builder.addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send transcripts to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        ),
      execute: async (interaction) => {
        const result = await handleTranscriptsSetup(interaction);
        return match(result, {
          ok: () => ok(undefined),
          err: (error) => {
            if (!error.includes("Insufficient permissions")) {
              InteractionResponse.error(interaction, error);
            }
            return err(error);
          },
        });
      },
    },
    panels: {
      name: "panels",
      description: "Create a support channel with a multi panel for tickets",
      execute: async (interaction) => {
        const result = await handlePanelsSetup(interaction);
        return match(result, {
          ok: () => ok(undefined),
          err: (error) => {
            InteractionResponse.error(interaction, "Failed to load panels. Please try again.");
            return err(error);
          },
        });
      },
    },
    feedback: {
      name: "feedback",
      description: "Enable or disable user feedback collection",
      options: (builder) =>
        builder.addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Whether to enable feedback collection")
            .setRequired(true)
        ),
      execute: async (interaction) => {
        const result = await handleFeedbackSetup(interaction);
        return match(result, {
          ok: () => ok(undefined),
          err: (error) => {
            InteractionResponse.error(interaction, "Failed to update feedback settings.");
            return err(error);
          },
        });
      },
    },
  },
});

const handleAutoSetup = async (interaction: ChatInputCommandInteraction): Promise<Result<void>> => {
  // First show confirmation
  const confirmEmbed = Embed.warning(
    "Auto Setup Confirmation",
    `This will configure ticketsbot.ai with the following:

**Will Create:**
• Two roles: **Tickets Admin** and **Tickets Support**
• Two categories: **Tickets** and **Support**
• Transcript channel: **#ticket-transcripts**
• Default team roles and permissions

**You will be:**
• Assigned the **Tickets Admin** role
• Given full bot administrator permissions

Do you want to proceed?`
  ).setAuthor({
    name: interaction.user.username,
    iconURL: interaction.user.displayAvatarURL(),
  });

  const confirmButton = new ButtonBuilder()
    .setCustomId("setup_auto_confirm")
    .setLabel("Confirm Setup")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");

  const cancelButton = new ButtonBuilder()
    .setCustomId("setup_auto_cancel")
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("❌");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

  await InteractionResponse.reply(interaction, {
    embeds: [confirmEmbed],
    components: [row],
    flags: EPHEMERAL_FLAG,
  });

  // Wait for confirmation
  try {
    const response = await interaction.channel?.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30000,
    });

    if (!response) return err("No response received");

    if (response.customId === "setup_auto_cancel") {
      await response.update({
        embeds: [Embed.info("Setup Cancelled", "Auto setup has been cancelled.")],
        components: [],
      });
      return ok(undefined);
    }

    // User confirmed, proceed with setup
    await response.deferUpdate();
    await InteractionEdit.edit(interaction, {
      embeds: [Embed.info("Setting up...", "Please wait while I configure your server...")],
      components: [],
    });

    const guild = interaction.guild!;
    const guildId = parseDiscordId(guild.id);
    const member = await guild.members.fetch(interaction.user.id);

    // Create roles
    const { adminRole, supportRole } = await createDefaultRoles(guild);

    // Create categories
    const { ticketsCategory, supportCategory } = await createDefaultCategories(
      guild,
      adminRole,
      supportRole
    );

    // Create transcript channel
    const transcriptChannel = await guild.channels.create({
      name: "ticket-transcripts",
      type: ChannelType.GuildText,
      parent: supportCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: adminRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: supportRole.id,
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    // Ensure default team roles exist
    await Role.ensureDefaultRoles(guildId);

    // Assign admin role to invoker
    const adminTeamRole = await Role.getRoleByName(guildId, "admin");
    if (adminTeamRole) {
      await User.ensure(
        parseDiscordId(interaction.user.id),
        interaction.user.username,
        interaction.user.discriminator,
        interaction.user.displayAvatarURL()
      );

      // Assign team role
      await Role.assignRole(adminTeamRole.id, parseDiscordId(interaction.user.id));

      // Update team role with Discord role ID
      await Role.updateRoleDiscordId(adminTeamRole.id, parseDiscordId(adminRole.id));

      // Assign Discord role using RoleOps
      await RoleOps.assignDiscordRole(member, adminRole.id);
    }

    // Update support role
    const supportTeamRole = await Role.getRoleByName(guildId, "support");
    if (supportTeamRole) {
      await Role.updateRoleDiscordId(supportTeamRole.id, parseDiscordId(supportRole.id));
    }

    // Update guild settings
    await ensureGuildWithDefaults({
      guildId,
      guildName: guild.name,
      defaultCategoryId: parseDiscordId(ticketsCategory.id),
      supportCategoryId: parseDiscordId(supportCategory.id),
      transcriptsChannel: parseDiscordId(transcriptChannel.id),
    });

    // Clear caches to ensure web UI gets fresh data
    if ((await import("@ticketsbot/core")).Redis.isAvailable()) {
      const { Redis } = await import("@ticketsbot/core");
      try {
        // Clear all user guild caches (we don't know which users need refresh)
        await Redis.withRetry(async (client) => {
          const keys = await client.keys("discord:guilds:*");
          if (keys.length > 0) {
            // Delete keys one by one to avoid spread operator issues
            for (const key of keys) {
              await client.del(key);
            }
          }

          // Also clear permission cache for the guild owner
          const permKey = `perms:${guildId}:${parseDiscordId(interaction.user.id)}`;
          await client.del(permKey);
        }, "setup.clearCaches");
        container.logger.info(
          `Cleared guild and permission caches after setup for guild ${guildId}`
        );
      } catch (error) {
        container.logger.warn("Failed to clear caches after setup:", error);
      }
    }

    const successEmbed = Embed.success(
      "Auto Setup Complete",
      `ticketsbot.ai has been automatically configured for your server!`
    )
      .addFields(
        {
          name: "🎭 Roles Created",
          value: `<@&${adminRole.id}> - Full admin access\n<@&${supportRole.id}> - Support team access`,
          inline: true,
        },
        {
          name: "📁 Categories Created",
          value: `**${ticketsCategory.name}** - For support tickets\n**${supportCategory.name}** - For team channels`,
          inline: true,
        },
        {
          name: "📝 Transcript Channel",
          value: `<#${transcriptChannel.id}>`,
          inline: true,
        },
        {
          name: "✅ Your Permissions",
          value: `You've been assigned:\n• <@&${adminRole.id}> role\n• Bot administrator permissions`,
          inline: false,
        }
      )
      .setFooter({
        text: guild.name,
        iconURL: guild.iconURL() || undefined,
      });

    await InteractionEdit.edit(interaction, { embeds: [successEmbed] });
    return ok(undefined);
  } catch (error) {
    if (error instanceof Error && error.message.includes("time")) {
      await InteractionEdit.error(interaction, "Setup timed out. Please try again.");
      return err("Setup timed out");
    }

    container.logger.error("Error in auto setup:", error);
    await InteractionEdit.error(
      interaction,
      "An error occurred during auto setup. Please try again."
    );
    return err("Auto setup failed");
  }
};

const handleLimitSetup = async (
  interaction: ChatInputCommandInteraction
): Promise<Result<void>> => {
  const limit = interaction.options.getInteger("number", true);
  const guildId = parseDiscordId(interaction.guild!.id);

  try {
    await ensureGuild(guildId, interaction.guild!.name);

    const message =
      limit === 0
        ? "Users can now create unlimited tickets."
        : `Users can now create a maximum of **${limit}** open ticket${limit === 1 ? "" : "s"} at a time.`;

    await InteractionResponse.success(interaction, message);
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error setting ticket limit:", error);
    return err("Failed to update ticket limit");
  }
};

const handleTranscriptsSetup = async (
  interaction: ChatInputCommandInteraction
): Promise<Result<void>> => {
  const channel = interaction.options.getChannel("channel", true) as TextChannel;
  const guildId = parseDiscordId(interaction.guild!.id);

  // Validate channel permissions
  const botMember = interaction.guild!.members.me;
  if (!botMember) {
    return err("Could not fetch bot member");
  }

  const permissions = channel.permissionsFor(botMember);
  if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    await InteractionResponse.error(
      interaction,
      `I don't have permission to send messages in <#${channel.id}>. Please ensure I have **View Channel** and **Send Messages** permissions.`
    );
    return err("Insufficient permissions");
  }

  try {
    await updateGuild(guildId, {
      transcriptsChannel: parseDiscordId(channel.id),
    }).catch(async () => {
      await ensureGuildWithDefaults({
        guildId,
        guildName: interaction.guild!.name,
        transcriptsChannel: parseDiscordId(channel.id),
      });
    });

    await InteractionResponse.success(
      interaction,
      `Ticket transcripts will now be sent to <#${channel.id}>.\n\nℹ️ Make sure this channel is only accessible to staff members!`
    );
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error setting transcript channel:", error);
    return err("Failed to update transcript channel");
  }
};

const handlePanelsSetup = async (
  interaction: ChatInputCommandInteraction
): Promise<Result<void>> => {
  try {
    // Panel.listAll() uses context to get the guild ID automatically
    const panels = await Panel.listAll({ orderBy: "title", order: "asc" });

    if (panels.length === 0) {
      await InteractionResponse.warning(
        interaction,
        `You don't have any panels created yet.\n\nUse the **[web dashboard](${process.env.WEB_URL || "https://tickets.example.com"})** to create your first panel!`
      );
      return ok(undefined);
    }

    // Create select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("setup_panel_selector")
      .setPlaceholder("Select panels to display")
      .setMinValues(1)
      .setMaxValues(Math.min(panels.length, 25));

    panels.slice(0, 25).forEach((panel) => {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(panel.title)
          .setDescription(panel.content?.substring(0, 100) || "No description")
          .setValue(panel.id.toString())
          .setEmoji(panel.emoji || "🎫")
      );
    });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const embed = Embed.info(
      "Create Multi-Panel Support Channel",
      `I'll create a new support channel with buttons for your selected panels.`
    ).addFields(
      {
        name: "📊 Available Panels",
        value: `You have **${panels.length}** panel${panels.length === 1 ? "" : "s"} configured`,
        inline: true,
      },
      {
        name: "⚙️ Channel Settings",
        value: "The channel will be created in your default category with proper permissions",
        inline: true,
      },
      {
        name: "💡 Tips",
        value:
          "• Select multiple panels for different support types\n• Each panel creates a different ticket category\n• You can always edit panels in the dashboard",
        inline: false,
      }
    );

    await InteractionResponse.reply(interaction, {
      embeds: [embed],
      components: [row],
      flags: EPHEMERAL_FLAG,
    });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error setting up panels:", error);
    return err("Failed to load panels");
  }
};

const handleFeedbackSetup = async (
  interaction: ChatInputCommandInteraction
): Promise<Result<void>> => {
  const enabled = interaction.options.getBoolean("enabled", true);
  const guildId = parseDiscordId(interaction.guild!.id);

  try {
    await updateGuild(guildId, { feedbackEnabled: enabled }).catch(async () => {
      await ensureGuildWithDefaults({
        guildId,
        guildName: interaction.guild!.name,
      });
      await updateGuild(guildId, { feedbackEnabled: enabled });
    });

    const embed = Embed.info(
      "Feedback Settings Updated",
      enabled
        ? "User feedback collection has been **enabled**."
        : "User feedback collection has been **disabled**."
    ).addFields({
      name: "What this means",
      value: enabled
        ? "• Users will see a feedback prompt after ticket closure\n• Ratings help track support quality\n• Feedback is stored for analytics"
        : "• No feedback will be requested\n• Existing feedback data is preserved\n• You can re-enable this anytime",
      inline: false,
    });

    await InteractionResponse.reply(interaction, { embeds: [embed], flags: EPHEMERAL_FLAG });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error updating feedback settings:", error);
    return err("Failed to update feedback settings");
  }
};
