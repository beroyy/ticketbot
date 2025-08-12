import { prisma } from "../../client";

export async function getGuildSettings(guildId: string) {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
  });

  if (!guild) {
    return null;
  }

  return {
    id: guild.id,
    settings: {
      transcriptsChannel: guild.transcriptsChannel,
      logChannel: guild.logChannel,
      defaultTicketMessage: guild.welcomeMessage,
      ticketCategories: [], // TODO: Load from junction table
      supportRoles: [], // TODO: Load from junction table
      ticketNameFormat: guild.ticketNameFormat,
      allowUserClose: guild.allowUserClose,
    },
    maxTicketsPerUser: guild.maxTicketsPerUser,
    defaultCategoryId: guild.defaultCategoryId,
    welcomeMessage: guild.welcomeMessage,
    showClaimButton: guild.showClaimButton,
    name: guild.name,
    ownerDiscordId: guild.ownerDiscordId,
    metadata: {
      totalTickets: guild.totalTickets,
      createdAt: guild.createdAt,
      updatedAt: guild.updatedAt,
    },
  };
}

export async function getTeamRoles(guildId: string) {
  const roles = await prisma.guildRole.findMany({
    where: { guildId },
    orderBy: { createdAt: "asc" },
  });

  return roles.map((role) => ({
    id: role.id,
    discordRoleId: role.discordRoleId,
    name: role.name,
    permissions: role.permissions.toString(),
    // permissionNames: PermissionUtils.getPermissionNames(role.permissions),
    createdAt: role.createdAt.toISOString(),
  }));
}

export async function updateGuild(
  guildId: string,
  data: {
    name?: string;
    ownerDiscordId?: string;
    feedbackEnabled?: boolean;
    [key: string]: any;
  }
) {
  return prisma.guild.update({
    where: { id: guildId },
    data,
  });
}

export async function getGuildById(guildId: string) {
  return prisma.guild.findUnique({
    where: { id: guildId },
  });
}
