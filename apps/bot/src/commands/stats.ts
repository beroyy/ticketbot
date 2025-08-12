import type { ChatInputCommandInteraction, User as DiscordUser } from "discord.js";
import { createCommand } from "@bot/lib/sapphire-extensions";
import {
  InteractionResponse,
  InteractionEdit,
  Embed,
  err,
  ok,
  StatsHelpers,
  STATS_CONSTANTS,
  EPHEMERAL_FLAG,
} from "@bot/lib/discord-utils";
import { Role } from "@ticketsbot/core/domains/role";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { Analytics } from "@ticketsbot/core/domains/analytics";
import { parseDiscordId, PermissionFlags } from "@ticketsbot/core";
import { getDiscordUser } from "@ticketsbot/db";
import { container } from "@sapphire/framework";

export const StatsCommand = createCommand({
  name: "stats",
  description: "View ticket statistics",
  preconditions: ["guild-only", "team-only"],

  options: (builder) =>
    builder
      .addSubcommand((subcommand) =>
        subcommand
          .setName("user")
          .setDescription("View statistics for a specific user")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("The user to view statistics for")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("server").setDescription("View server-wide ticket statistics")
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("team").setDescription("View team performance statistics")
      ),

  execute: async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "user":
        return handleUserStats(interaction);
      case "server":
        return handleServerStats(interaction);
      case "team":
        return handleTeamStats(interaction);
      default:
        return err("Invalid subcommand");
    }
  },
});

const handleUserStats = async (interaction: ChatInputCommandInteraction) => {
  const targetUser = interaction.options.getUser("user", true);
  const guild = interaction.guild!;
  const guildId = parseDiscordId(guild.id);
  const discordUserId = parseDiscordId(targetUser.id);

  await interaction.deferReply({ flags: EPHEMERAL_FLAG });

  try {
    // Check if user exists
    const discordUser = await getDiscordUser(discordUserId);
    if (!discordUser) {
      await InteractionResponse.error(interaction, "User not found in database");
      return err("User not found");
    }

    // Check if user is a team member
    const hasTeamPermissions = await Role.hasPermission(
      guildId,
      discordUserId,
      PermissionFlags.TICKET_VIEW_ALL
    );

    if (hasTeamPermissions) {
      return displayTeamMemberStats(interaction, targetUser, guildId, discordUserId);
    } else {
      return displayRegularUserStats(interaction, targetUser, discordUserId);
    }
  } catch (error) {
    container.logger.error("Error generating user stats:", error);
    await InteractionResponse.error(
      interaction,
      "An error occurred while generating user statistics."
    );
    return err("Failed to generate user stats");
  }
};

const displayTeamMemberStats = async (
  interaction: ChatInputCommandInteraction,
  targetUser: DiscordUser,
  guildId: string,
  discordUserId: string
) => {
  const [stats, userRoles] = await Promise.all([
    Analytics.getStaffPerformance({
      guildId,
      staffId: discordUserId,
    }),
    Role.getUserRoles(guildId, discordUserId),
  ]);

  const embed = Embed.info(
    `Role Member Statistics for ${targetUser.tag}`,
    `Statistics for team member <@${targetUser.id}>`
  ).addFields(
    { name: "🎫 Currently Claimed", value: stats.claimedCount.toString(), inline: true },
    { name: "🔒 Tickets Closed", value: stats.closedByUserCount.toString(), inline: true },
    { name: "🔄 Transfers Given", value: stats.transfersGiven.toString(), inline: true },
    { name: "📥 Transfers Received", value: stats.transfersReceived.toString(), inline: true },
    { name: "⚡ Total Actions", value: stats.totalActions.toString(), inline: true },
    {
      name: "👨‍💼 Roles",
      value: userRoles.length > 0 ? userRoles.map((r) => r.name).join(", ") : "None",
      inline: true,
    }
  );

  await InteractionEdit.edit(interaction, { embeds: [embed] });
  return ok(undefined);
};

const displayRegularUserStats = async (
  interaction: ChatInputCommandInteraction,
  targetUser: DiscordUser,
  discordUserId: string
) => {
  // For regular users, we just need their open ticket count
  const openCount = await Ticket.getUserOpenCount(discordUserId);

  // TODO: Get user's total ticket stats from Analytics domain
  const stats = { openedCount: 0, averageResponseTimeMinutes: 0 };

  const totalCount = stats.openedCount;
  const closedCount = totalCount - openCount;
  const avgResponseTime = StatsHelpers.formatDuration(stats.averageResponseTimeMinutes);

  const embed = Embed.info(
    `User Statistics for ${targetUser.tag}`,
    `Ticket statistics for <@${targetUser.id}>`
  ).addFields(
    { name: "🎫 Total Tickets", value: totalCount.toString(), inline: true },
    { name: "🟢 Open Tickets", value: openCount.toString(), inline: true },
    { name: "🔒 Closed Tickets", value: closedCount.toString(), inline: true },
    { name: "⏱️ Avg Response Time", value: avgResponseTime, inline: true },
    {
      name: "📈 Completion Rate",
      value: StatsHelpers.formatPercentage(closedCount, totalCount),
      inline: true,
    }
  );

  await InteractionEdit.edit(interaction, { embeds: [embed] });
  return ok(undefined);
};

const handleServerStats = async (interaction: ChatInputCommandInteraction) => {
  const guild = interaction.guild!;
  const guildId = parseDiscordId(guild.id);

  await interaction.deferReply({ flags: EPHEMERAL_FLAG });

  try {
    const [monthStats, weekStats, activeTeamMembers] = await Promise.all([
      Analytics.getTicketStatistics({
        guildId,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        includeDeleted: false,
      }),
      Analytics.getTicketStatistics({
        guildId,
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        includeDeleted: false,
      }),
      Role.getActiveMembers(guildId),
    ]);

    // Map to expected format
    const serverStats = {
      totalTickets: monthStats.totalCreated,
      openTickets: monthStats.totalOpen,
      closedTickets: monthStats.totalClosed,
      averageResolutionTimeHours: monthStats.avgResolutionTime,
    };

    const serverStats7Days = {
      closedTickets: weekStats.totalClosed,
    };

    // TODO: Get feedback stats from Analytics
    const feedbackStats = { averageRating: null, totalFeedback: 0 };

    const embed = Embed.primary("Server Statistics", `Ticket statistics for **${guild.name}**`)
      .addFields(
        { name: "🎫 Total Tickets", value: serverStats.totalTickets.toString(), inline: true },
        { name: "🟢 Open Tickets", value: serverStats.openTickets.toString(), inline: true },
        { name: "🔒 Closed Tickets", value: serverStats.closedTickets.toString(), inline: true },
        {
          name: "📅 Last 7 Days",
          value: serverStats7Days.closedTickets.toString(),
          inline: true,
        },
        { name: "📆 Last 30 Days", value: serverStats.closedTickets.toString(), inline: true },
        { name: "👥 Role Members", value: activeTeamMembers.length.toString(), inline: true },
        {
          name: "⏱️ Avg Resolution Time",
          value: StatsHelpers.formatDuration(
            serverStats.averageResolutionTimeHours
              ? serverStats.averageResolutionTimeHours * 60
              : null
          ),
          inline: true,
        },
        {
          name: "📈 Resolution Rate",
          value: StatsHelpers.formatPercentage(serverStats.closedTickets, serverStats.totalTickets),
          inline: true,
        },
        { name: "⭐ Average Rating", value: feedbackStats.averageRating || "N/A", inline: true },
        { name: "📝 Feedback Count", value: feedbackStats.totalFeedback.toString(), inline: true }
      )
      .setFooter({ text: `Statistics generated at ${new Date().toLocaleString()}` });

    await InteractionEdit.edit(interaction, { embeds: [embed] });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error generating server stats:", error);
    await InteractionResponse.error(
      interaction,
      "An error occurred while generating server statistics."
    );
    return err("Failed to generate server stats");
  }
};

const handleTeamStats = async (interaction: ChatInputCommandInteraction) => {
  const guild = interaction.guild!;
  const guildId = parseDiscordId(guild.id);

  await interaction.deferReply({ flags: EPHEMERAL_FLAG });

  try {
    const teamMembers = await Role.getActiveMembersWithDetails(guildId);

    if (teamMembers.length === 0) {
      await InteractionEdit.edit(interaction, {
        embeds: [
          Embed.info(
            "No Role Members Found",
            "No team members have been configured for this server."
          ),
        ],
      });
      return ok(undefined);
    }

    // Get stats for all team members
    const staffStats = await Promise.all(
      teamMembers.map(async (member: Role.RoleMemberWithDetails) => {
        const [performanceStats, memberRoles] = await Promise.all([
          Analytics.getStaffPerformance({
            guildId,
            staffId: member.discordId,
          }),
          Role.getUserRoles(guildId, member.discordId),
        ]);

        // Extract first staff member stats (since we're querying by specific ID)
        const stats = Array.isArray(performanceStats) ? performanceStats[0] : performanceStats;

        return {
          id: member.discordId,
          roles: memberRoles.map((r) => r.name).join(", "),
          closed: stats?.ticketsClosed || 0,
          claimed: stats?.ticketsClaimed || 0,
          actions: (stats?.ticketsClosed || 0) + (stats?.ticketsClaimed || 0),
          averageRating: stats?.satisfactionRating,
          feedbackCount: stats?.feedbackCount || 0,
        };
      })
    );

    // Sort by total actions
    staffStats.sort((a, b) => (b.actions || 0) - (a.actions || 0));

    // Build leaderboard
    const topStaff = staffStats.slice(0, STATS_CONSTANTS.TOP_PERFORMERS_LIMIT);

    const staffList = topStaff
      .map((staff, index) => {
        const medal = StatsHelpers.getMedalEmoji(index);
        const rating = StatsHelpers.formatRating(staff.averageRating);
        return `${medal} <@${staff.id}> (${staff.roles || "Unknown"})\n📝 ${staff.actions} actions • 🔒 ${staff.closed} closed • 🎫 ${staff.claimed} claimed • ${rating}`;
      })
      .join("\n\n");

    const totalClosed = staffStats.reduce((sum, staff) => sum + (staff.closed || 0), 0);
    const totalActions = staffStats.reduce((sum, staff) => sum + (staff.actions || 0), 0);

    const embed = Embed.primary(
      "Role Performance Statistics",
      `Performance overview for all team members\n\n${staffList}`
    ).addFields(
      { name: "👥 Total Role Members", value: teamMembers.length.toString(), inline: true },
      { name: "🔒 Total Closed", value: totalClosed.toString(), inline: true },
      { name: "⚡ Total Actions", value: totalActions.toString(), inline: true }
    );

    await InteractionEdit.edit(interaction, { embeds: [embed] });
    return ok(undefined);
  } catch (error) {
    container.logger.error("Error generating team stats:", error);
    await InteractionResponse.error(
      interaction,
      "An error occurred while generating team statistics."
    );
    return err("Failed to generate team stats");
  }
};
