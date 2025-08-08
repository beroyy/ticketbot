import { prisma } from "@ticketsbot/db";

export const ensureGuild = async (
  guildId: string,
  name?: string,
  ownerId?: string
): Promise<any> => {
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
};

export const updateGuild = async (
  guildId: string,
  data: {
    name?: string;
    ownerDiscordId?: string;
    feedbackEnabled?: boolean;
    [key: string]: any;
  }
): Promise<any> => {
  return prisma.guild.update({
    where: { id: guildId },
    data,
  });
};

export const getGuildById = async (guildId: string): Promise<any> => {
  return prisma.guild.findUnique({
    where: { id: guildId },
  });
};

export const getSettingsUnchecked = async (guildId: string): Promise<any> => {
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
};

export const ensureGuildWithDefaults = async (data: {
  guildId: string;
  guildName: string;
  ownerId?: string;
  defaultCategoryId?: string;
  supportCategoryId?: string;
  transcriptsChannel?: string;
}): Promise<any> => {
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
};

export const syncBotInstallStatus = async (currentGuildIds: string[]): Promise<void> => {
  // First, set all guilds to botInstalled = false
  await prisma.guild.updateMany({
    where: {},
    data: { botInstalled: false },
  });

  // Then set current guilds to botInstalled = true
  if (currentGuildIds.length > 0) {
    await prisma.guild.updateMany({
      where: { id: { in: currentGuildIds } },
      data: { botInstalled: true },
    });
  }
};

export const Blacklist = {
  toggle: async (guildId: string, targetId: string, isRole: boolean): Promise<boolean> => {
    // Check if already blacklisted
    const existing = await prisma.blacklist.findFirst({
      where: {
        guildId,
        targetId,
        isRole,
      },
    });

    if (existing) {
      // Remove from blacklist
      await prisma.blacklist.delete({
        where: { id: existing.id },
      });
      return false;
    } else {
      // Add to blacklist
      await prisma.blacklist.create({
        data: {
          guildId,
          targetId,
          isRole,
        },
      });
      return true;
    }
  },

  isBlacklisted: async (guildId: string, userId: string): Promise<boolean> => {
    const entry = await prisma.blacklist.findFirst({
      where: {
        guildId,
        targetId: userId,
        isRole: false,
      },
    });
    return !!entry;
  },
};

export const getAccessibleGuilds = async (discordUserId: string): Promise<string[]> => {
  const guilds = await prisma.guild.findMany({
    where: {
      OR: [
        { ownerDiscordId: discordUserId },
        { guildMemberPermissions: { some: { discordId: discordUserId } } },
      ],
    },
    select: { id: true },
  });

  return guilds.map((g) => g.id);
};
