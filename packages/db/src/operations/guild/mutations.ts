import { prisma } from "../../client";
import { Prisma } from "../..";

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
