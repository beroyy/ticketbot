import { prisma, type Prisma } from "@ticketsbot/db";
import { Actor, VisibleError } from "../../context";
import { PermissionFlags } from "../../permissions/constants";

type FormattedGuildSettings = ReturnType<typeof formatGuildSettings>;
type FormattedTeamRole = {
  id: number;
  discordRoleId: string | null;
  name: string;
  permissions: string;
  permissionNames: string[];
  createdAt: string;
};
type FormattedBlacklistEntry = {
  id: number;
  targetId: string;
  isRole: boolean;
  reason: string | null;
  createdAt: string;
};

export namespace Guild {
  export const getSettings = async (): Promise<FormattedGuildSettings> => {
    Actor.requirePermission(PermissionFlags.GUILD_SETTINGS_VIEW);
    const guildId = Actor.guildId();

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        tags: {
          orderBy: { id: "desc" },
        },
      },
    });

    if (!guild) {
      throw new VisibleError("not_found", "Guild not found");
    }

    return formatGuildSettings(guild);
  };

  export const updateSettings = async (input: {
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
  }): Promise<FormattedGuildSettings> => {
    Actor.requirePermission(PermissionFlags.GUILD_SETTINGS_EDIT);
    const guildId = Actor.guildId();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.guild.findUnique({
        where: { id: guildId },
      });

      if (!existing) {
        throw new VisibleError("not_found", "Guild not found");
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

      // Event logging removed - TCN will handle this automatically

      return formatGuildSettings(updated);
    });
  };

  export const getTeamRoles = async (): Promise<FormattedTeamRole[]> => {
    const guildId = Actor.guildId();

    const roles = await prisma.guildRole.findMany({
      where: { guildId },
      orderBy: { createdAt: "asc" },
    });

    return roles.map((role) => ({
      id: role.id,
      discordRoleId: role.discordRoleId,
      name: role.name,
      permissions: role.permissions.toString(),
      permissionNames: getPermissionNames(role.permissions),
      createdAt: role.createdAt.toISOString(),
    }));
  };

  export const getBlacklist = async (): Promise<FormattedBlacklistEntry[]> => {
    Actor.requirePermission(PermissionFlags.MEMBER_BLACKLIST);
    const guildId = Actor.guildId();

    const blacklist = await prisma.blacklist.findMany({
      where: { guildId },
      orderBy: { createdAt: "desc" },
    });

    return blacklist.map((entry) => ({
      id: entry.id,
      targetId: entry.targetId,
      isRole: entry.isRole,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    }));
  };

  export const addToBlacklist = async (input: {
    targetId: string;
    isRole: boolean;
    reason?: string;
  }) => {
    Actor.requirePermission(PermissionFlags.MEMBER_BLACKLIST);
    const guildId = Actor.guildId();

    const existing = await prisma.blacklist.findFirst({
      where: {
        guildId,
        targetId: input.targetId,
        isRole: input.isRole,
      },
    });

    if (existing) {
      throw new VisibleError("conflict", "Target is already blacklisted");
    }

    const entry = await prisma.blacklist.create({
      data: {
        guildId,
        targetId: input.targetId,
        isRole: input.isRole,
        reason: input.reason,
      },
    });

    // Event logging removed - TCN will handle this automatically

    return {
      id: entry.id,
      targetId: entry.targetId,
      isRole: entry.isRole,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    };
  };

  export const removeFromBlacklist = async (targetId: string, isRole: boolean): Promise<any> => {
    Actor.requirePermission(PermissionFlags.MEMBER_UNBLACKLIST);
    const guildId = Actor.guildId();

    const deleted = await prisma.blacklist.deleteMany({
      where: {
        guildId,
        targetId,
        isRole,
      },
    });

    if (deleted.count === 0) {
      throw new VisibleError("not_found", "Blacklist entry not found");
    }

    // Event logging removed - TCN will handle this automatically

    return { success: true, removed: deleted.count };
  };
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

function getPermissionNames(permissions: bigint): string[] {
  const names: string[] = [];

  for (const [name, value] of Object.entries(PermissionFlags)) {
    if (typeof value === "bigint" && (permissions & value) === value) {
      names.push(name);
    }
  }

  return names;
}
