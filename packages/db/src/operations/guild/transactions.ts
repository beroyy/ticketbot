import { prisma } from "../../client";
import { Prisma } from "../..";

/**
 * Initialize a guild when the bot joins
 * Sets up guild, owner, and default roles in a single transaction
 * Used by guild-create listener
 */
export async function initialize(data: {
  guildId: string;
  guildName: string;
  ownerId: string;
  ownerData: {
    username: string;
    discriminator: string;
    avatarUrl: string;
  };
}): Promise<void> {
  const { guildId, guildName, ownerId, ownerData } = data;

  await prisma.$transaction(async (tx) => {
    // 1. Ensure guild exists and is marked as installed
    await tx.guild.upsert({
      where: { id: guildId },
      update: {
        name: guildName,
        botInstalled: true,
      },
      create: {
        id: guildId,
        name: guildName,
        botInstalled: true,
      },
    });

    // 2. Ensure owner exists in user database
    await tx.discordUser.upsert({
      where: { id: ownerId },
      update: {
        username: ownerData.username,
        discriminator: ownerData.discriminator,
        avatarUrl: ownerData.avatarUrl,
      },
      create: {
        id: ownerId,
        username: ownerData.username,
        discriminator: ownerData.discriminator,
        avatarUrl: ownerData.avatarUrl,
      },
    });

    // 3. Create default team roles (admin, support, viewer)
    const adminRole = await tx.guildRole.upsert({
      where: {
        guildId_name: {
          guildId: guildId,
          name: "admin",
        },
      },
      update: {
        isDefault: true,
        permissions: BigInt("0xfffffff"), // All permissions
      },
      create: {
        guildId: guildId,
        name: "admin",
        color: "#5865F2",
        position: 100,
        isDefault: true,
        permissions: BigInt("0xfffffff"),
      },
    });

    await tx.guildRole.upsert({
      where: {
        guildId_name: {
          guildId: guildId,
          name: "support",
        },
      },
      update: {
        isDefault: true,
        permissions: BigInt("0x400446"), // Support permissions
      },
      create: {
        guildId: guildId,
        name: "support",
        color: "#57F287",
        position: 50,
        isDefault: true,
        permissions: BigInt("0x400446"),
      },
    });

    await tx.guildRole.upsert({
      where: {
        guildId_name: {
          guildId: guildId,
          name: "viewer",
        },
      },
      update: {
        isDefault: true,
        permissions: BigInt("0x800011"), // Viewer permissions
      },
      create: {
        guildId: guildId,
        name: "viewer",
        color: "#99AAB5",
        position: 10,
        isDefault: true,
        permissions: BigInt("0x800011"),
      },
    });

    // 4. Assign owner to admin role
    await tx.guildRoleMember.upsert({
      where: {
        discordId_guildRoleId: {
          discordId: ownerId,
          guildRoleId: adminRole.id,
        },
      },
      update: {
        assignedAt: new Date(),
      },
      create: {
        discordId: ownerId,
        guildRoleId: adminRole.id,
        assignedById: null, // System assignment
      },
    });
  });
}

/**
 * Cleanup when a member leaves a guild
 * Removes roles, ticket participation, and unclaims tickets
 * Used by guild-member-remove listener
 */
export async function cleanupMember(
  guildId: string,
  userId: string
): Promise<{ rolesRemoved: number; ticketsAffected: number; ticketsUnclaimed: number }> {
  return prisma.$transaction(async (tx) => {
    // 1. Remove all roles from member
    const removedRoles = await tx.guildRoleMember.deleteMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId: guildId,
        },
      },
    });

    // 2. Remove from all ticket participants
    const removedFromTickets = await tx.ticketParticipant.deleteMany({
      where: {
        userId: userId,
        ticket: {
          guildId: guildId,
          status: {
            in: ["OPEN", "CLAIMED"],
          },
        },
      },
    });

    // 3. Unclaim any tickets they had claimed
    const unclaimedTickets = await tx.ticket.updateMany({
      where: {
        guildId: guildId,
        claimedById: userId,
        status: "CLAIMED",
      },
      data: {
        status: "OPEN",
        claimedById: null,
      },
    });

    return {
      rolesRemoved: removedRoles.count,
      ticketsAffected: removedFromTickets.count,
      ticketsUnclaimed: unclaimedTickets.count,
    };
  });
}

/**
 * Ensure guild exists with default settings and roles
 * Creates guild, default role, and basic configuration
 */
export async function ensureGuildWithDefaults(data: {
  guildId: string;
  guildName: string;
  ownerId?: string;
  defaultCategoryId?: string;
  supportCategoryId?: string;
  transcriptsChannel?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Create or update guild
    const guild = await tx.guild.upsert({
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
    const defaultRole = await tx.guildRole.findFirst({
      where: {
        guildId: guild.id,
        name: "Support",
      },
    });

    if (!defaultRole) {
      await tx.guildRole.create({
        data: {
          guildId: guild.id,
          name: "Support",
          permissions: BigInt("0x1ffffff"), // Default support permissions
        },
      });
    }

    return guild;
  });
}

/**
 * Update guild settings with complex nested data
 * Handles settings, footer, colors, and branding in a transaction
 */
export async function updateGuildSettings(
  guildId: string,
  input: {
    settings?: {
      transcriptsChannel?: string | null;
      logChannel?: string | null;
      defaultTicketMessage?: string | null;
      ticketCategories?: string[];
      supportRoles?: string[];
      ticketNameFormat?: string;
      allowUserClose?: boolean;
    };
    footer?: {
      text?: string | null;
      link?: string | null;
    };
    colors?: {
      primary?: string;
      success?: string;
      error?: string;
    };
    branding?: {
      name?: string;
      logo?: string | null;
      banner?: string | null;
    };
  }
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.guild.findUnique({
      where: { id: guildId },
    });

    if (!existing) {
      console.error("Guild not found", guildId);
      return null;
    }

    const updateData: Prisma.GuildUpdateInput = {};

    if (input.settings) {
      if (input.settings.transcriptsChannel !== undefined) {
        updateData.transcriptsChannel = input.settings.transcriptsChannel;
      }
      if (input.settings.logChannel !== undefined) {
        updateData.logChannel = input.settings.logChannel;
      }
      if (input.settings.defaultTicketMessage !== undefined) {
        updateData.defaultTicketMessage = input.settings.defaultTicketMessage;
      }
      if (input.settings.ticketCategories !== undefined) {
        // This will be handled separately after the main update
      }
      if (input.settings.supportRoles !== undefined) {
        // This will be handled separately after the main update
      }
      if (input.settings.ticketNameFormat !== undefined) {
        updateData.ticketNameFormat = input.settings.ticketNameFormat;
      }
      if (input.settings.allowUserClose !== undefined) {
        updateData.allowUserClose = input.settings.allowUserClose;
      }
    }

    if (input.footer) {
      if (input.footer.text !== undefined) {
        updateData.footerText = input.footer.text;
      }
      if (input.footer.link !== undefined) {
        updateData.footerLink = input.footer.link;
      }
    }

    if (input.colors) {
      updateData.colorScheme = {
        ...((existing.colorScheme as Record<string, unknown>) || {}),
        ...input.colors,
      };
    }

    if (input.branding) {
      updateData.branding = {
        ...((existing.branding as Record<string, unknown>) || {}),
        ...input.branding,
      };
    }

    const updated = await tx.guild.update({
      where: { id: guildId },
      data: updateData,
      include: {
        tags: {
          orderBy: { id: "desc" },
        },
      },
    });

    return formatGuildSettings(updated);
  });
}

function formatGuildSettings(guild: any) {
  return {
    id: guild.id,
    settings: {
      transcriptsChannel: guild.transcriptsChannel,
      logChannel: guild.logChannel,
      defaultTicketMessage: guild.defaultTicketMessage,
      ticketCategories: guild.ticketCategories || [],
      supportRoles: guild.supportRoles || [],
      ticketNameFormat: guild.ticketNameFormat || "ticket-{number}",
      allowUserClose: guild.allowUserClose,
    },
    footer: {
      text: guild.footerText,
      link: guild.footerLink,
    },
    colors: guild.colorScheme || {
      primary: "#5865F2",
      success: "#57F287",
      error: "#ED4245",
    },
    branding: guild.branding || {
      name: "Support",
      logo: null,
      banner: null,
    },
    tags:
      guild.tags?.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        content: tag.content,
      })) || [],
    metadata: {
      totalTickets: guild.totalTickets || 0,
      createdAt: guild.createdAt.toISOString(),
      updatedAt: guild.updatedAt.toISOString(),
    },
  };
}