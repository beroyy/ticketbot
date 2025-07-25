import { prisma } from "../../prisma/client";

/**
 * Static guild methods that don't require actor context
 * Used primarily for bot operations and system tasks
 */

/**
 * Ensure a guild exists in the database
 * Used when bot joins a new guild or needs to ensure guild exists
 */
export const ensure = async (guildId: string, name?: string, ownerId?: string): Promise<any> => {
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

/**
 * Update basic guild information
 * Used for updating guild name, owner, etc.
 */
export const update = async (
  guildId: string,
  data: {
    name?: string;
    ownerDiscordId?: string;
    feedbackEnabled?: boolean;
    [key: string]: any; // Allow other fields
  }
): Promise<any> => {
  return prisma.guild.update({
    where: { id: guildId },
    data,
  });
};

/**
 * Find a guild by ID without permission checks
 * For system operations and existence checks
 */
export const findById = async (guildId: string): Promise<any> => {
  return prisma.guild.findUnique({
    where: { id: guildId },
  });
};

/**
 * Get guild settings without permission checks
 * Only for system operations - prefer Guild.getSettings() when you have context
 */
export const getSettingsUnchecked = async (guildId: string): Promise<any> => {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
  });

  if (!guild) {
    return null;
  }

  // Return formatted settings
  return {
    id: guild.id,
    settings: {
      transcriptsChannel: guild.transcriptsChannel,
      logChannel: guild.logChannel,
      defaultTicketMessage: guild.welcomeMessage,
      ticketCategories: [], // TODO: Load from junction table
      autoCloseTime: guild.autoCloseTime,
      supportRoles: [], // TODO: Load from junction table
      ticketNameFormat: guild.ticketNameFormat,
      allowUserClose: guild.allowUserClose,
      threadTickets: guild.threadTickets,
      autoThreadArchive: guild.autoThreadArchive,
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

/**
 * Create guild with default settings
 * Used when bot is added to a new server
 */
export const ensureWithDefaults = async (data: {
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
  const defaultRole = await prisma.teamRole.findFirst({
    where: {
      guildId: guild.id,
      name: "Support Team",
    },
  });

  if (!defaultRole) {
    await prisma.teamRole.create({
      data: {
        guildId: guild.id,
        name: "Support Team",
        permissions: BigInt("0x1ffffff"), // Default support permissions
      },
    });
  }

  return guild;
};

/**
 * Static blacklist namespace for bot operations
 */
export const Blacklist = {
  /**
   * Toggle blacklist status (add/remove)
   * Returns true if added, false if removed
   */
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

  /**
   * Check if a user is blacklisted
   */
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
