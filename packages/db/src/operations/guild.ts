import { prisma } from "../client";

export async function ensureGuild(guildId: string, name?: string, ownerId?: string) {
  return prisma.guild.upsert({
    where: { id: guildId },
    update: {
      ...(name && { name }),
      ...(ownerId && { ownerDiscordId: ownerId }),
    },
    create: {
      id: guildId,
      name: name || "Unknown Guild",
      ownerDiscordId: ownerId || null,
    },
  });
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

export async function ensureGuildWithDefaults(data: {
  guildId: string;
  guildName: string;
  ownerId?: string;
  defaultCategoryId?: string;
  supportCategoryId?: string;
  transcriptsChannel?: string;
}) {
  // Create or update guild
  const guild = await prisma.guild.upsert({
    where: { id: data.guildId },
    update: {
      name: data.guildName,
      ...(data.defaultCategoryId && { defaultCategoryId: data.defaultCategoryId }),
      ...(data.supportCategoryId && { supportCategoryId: data.supportCategoryId }),
      ...(data.transcriptsChannel && { transcriptsChannel: data.transcriptsChannel }),
    },
    create: {
      id: data.guildId,
      name: data.guildName,
      ownerDiscordId: data.ownerId || null,
      ...(data.defaultCategoryId && { defaultCategoryId: data.defaultCategoryId }),
      ...(data.supportCategoryId && { supportCategoryId: data.supportCategoryId }),
      ...(data.transcriptsChannel && { transcriptsChannel: data.transcriptsChannel }),
    },
  });

  // Ensure default team role exists
  const defaultRole = await prisma.guildRole.findFirst({
    where: {
      guildId: guild.id,
      name: "Support",
    },
  });

  if (!defaultRole) {
    await prisma.guildRole.create({
      data: {
        guildId: guild.id,
        name: "Support",
        permissions: BigInt("0x1ffffff"), // Default support permissions
      },
    });
  }

  return guild;
}

export async function syncGuildBotInstalledStatus(currentGuildIds: string[]) {
  await prisma.guild.updateMany({
    where: {},
    data: { botInstalled: false },
  });

  if (currentGuildIds.length > 0) {
    await prisma.guild.updateMany({
      where: { id: { in: currentGuildIds } },
      data: { botInstalled: true },
    });
  }
}

export async function toggleGuildBlacklistEntry(
  guildId: string,
  targetId: string,
  isRole: boolean
) {
  const existing = await prisma.blacklist.findFirst({
    where: {
      guildId,
      targetId,
      isRole,
    },
  });

  if (existing) {
    await prisma.blacklist.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.blacklist.create({
      data: {
        guildId,
        targetId,
        isRole,
      },
    });
  }

  return !existing;
}

export async function checkGuildBlacklistEntry(guildId: string, userId: string) {
  const entry = await prisma.blacklist.findFirst({
    where: {
      guildId,
      targetId: userId,
      isRole: false,
    },
  });
  return Boolean(entry);
}
