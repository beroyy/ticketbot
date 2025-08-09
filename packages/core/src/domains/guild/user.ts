import {
  prisma,
  TicketStatus,
  type Prisma,
  type Guild as _PrismaGuild,
  type GuildRole as _TeamRole,
  type Blacklist as _Blacklist,
} from "@ticketsbot/db";
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

  export const getStatistics = async (): Promise<any> => {
    Actor.requirePermission(PermissionFlags.ANALYTICS_VIEW);
    const guildId = Actor.guildId();

    const now = new Date();

    const timeframeConfigs = {
      "1D": { days: 1, bucketSize: "hour", bucketCount: 24 },
      "1W": { days: 7, bucketSize: "day", bucketCount: 7 },
      "1M": { days: 30, bucketSize: "day", bucketCount: 30 },
      "3M": { days: 90, bucketSize: "week", bucketCount: 13 },
    };

    const generateBuckets = (timeframe: keyof typeof timeframeConfigs) => {
      const config = timeframeConfigs[timeframe];
      const buckets: { start: Date; end: Date; date: string }[] = [];
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - config.days);

      if (config.bucketSize === "hour") {
        startDate.setHours(0, 0, 0, 0);
        for (let i = 0; i < 24; i++) {
          const bucketStart = new Date(startDate);
          bucketStart.setHours(i);
          const bucketEnd = new Date(bucketStart);
          bucketEnd.setHours(i + 1);

          if (bucketEnd <= now) {
            buckets.push({
              start: bucketStart,
              end: bucketEnd,
              date: bucketStart.toISOString(),
            });
          }
        }
      } else if (config.bucketSize === "day") {
        const currentDate = new Date(startDate);
        while (currentDate < now) {
          const bucketStart = new Date(currentDate);
          const bucketEnd = new Date(currentDate);
          bucketEnd.setDate(bucketEnd.getDate() + 1);

          buckets.push({
            start: bucketStart,
            end: bucketEnd > now ? now : bucketEnd,
            date: bucketStart.toISOString(),
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (config.bucketSize === "week") {
        const currentDate = new Date(startDate);
        while (currentDate < now) {
          const bucketStart = new Date(currentDate);
          const bucketEnd = new Date(currentDate);
          bucketEnd.setDate(bucketEnd.getDate() + 7);

          buckets.push({
            start: bucketStart,
            end: bucketEnd > now ? now : bucketEnd,
            date: bucketStart.toISOString(),
          });

          currentDate.setDate(currentDate.getDate() + 7);
        }
      }

      return buckets;
    };

    const allBuckets = {
      "1D": generateBuckets("1D"),
      "1W": generateBuckets("1W"),
      "1M": generateBuckets("1M"),
      "3M": generateBuckets("3M"),
    };

    const [totalTickets, openTickets, topSupportAgents, ticketsByCategory, allBucketCounts] =
      await Promise.all([
        prisma.ticket.count({
          where: { guildId },
        }),

        prisma.ticket.count({
          where: {
            guildId,
            status: TicketStatus.OPEN,
          },
        }),

        prisma.ticketLifecycleEvent.groupBy({
          by: ["performedById"],
          where: {
            action: "closed",
            timestamp: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            ticket: {
              guildId,
            },
          },
          _count: true,
          orderBy: {
            _count: {
              performedById: "desc",
            },
          },
          take: 5,
        }),

        prisma.ticket.groupBy({
          by: ["categoryId"],
          where: {
            guildId,
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
          _count: true,
        }),

        Promise.all(
          Object.entries(allBuckets).map(async ([timeframe, buckets]: [string, any[]]) => {
            const counts = await Promise.all(
              buckets.map((bucket: any) =>
                prisma.ticket.count({
                  where: {
                    guildId,
                    createdAt: {
                      gte: bucket.start,
                      lt: bucket.end,
                    },
                  },
                })
              )
            );
            return { timeframe, counts };
          })
        ),
      ]);

    const bucketCountsByTimeframe: Record<string, number[]> = {};
    allBucketCounts.forEach(({ timeframe, counts }: { timeframe: string; counts: number[] }) => {
      bucketCountsByTimeframe[timeframe] = counts;
    });

    const chartDataByTimeframe: Record<string, any[]> = {};
    const periodDataByTimeframe: Record<string, any> = {};

    Object.entries(allBuckets).forEach(([timeframe, buckets]) => {
      const counts = bucketCountsByTimeframe[timeframe] || [];

      chartDataByTimeframe[timeframe] = buckets.map((bucket, index) => ({
        date: bucket.date,
        tickets: counts[index] || 0,
      }));

      const periodTotal = counts.reduce((sum, count) => sum + count, 0);

      const config = timeframeConfigs[timeframe as keyof typeof timeframeConfigs];
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - config.days);

      const prevPeriodStart = new Date(periodStart);
      prevPeriodStart.setDate(prevPeriodStart.getDate() - config.days);

      periodDataByTimeframe[timeframe] = {
        totalTickets: periodTotal,
        startDate: periodStart.toISOString(),
        endDate: now.toISOString(),
      };
    });

    const percentageChangeByTimeframe: Record<string, any> = {};
    for (const timeframe of Object.keys(timeframeConfigs)) {
      const config = timeframeConfigs[timeframe as keyof typeof timeframeConfigs];
      const currentStart = new Date(now);
      currentStart.setDate(currentStart.getDate() - config.days);
      const prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - config.days);

      const [currentCount, previousCount] = await Promise.all([
        prisma.ticket.count({
          where: {
            guildId,
            createdAt: { gte: currentStart },
          },
        }),
        prisma.ticket.count({
          where: {
            guildId,
            createdAt: {
              gte: prevStart,
              lt: currentStart,
            },
          },
        }),
      ]);

      const percentageChange =
        previousCount === 0
          ? currentCount > 0
            ? 100
            : 0
          : Math.round(((currentCount - previousCount) / previousCount) * 100);

      percentageChangeByTimeframe[timeframe] = {
        currentPeriod: {
          totalTickets: currentCount,
          startDate: currentStart.toISOString(),
          endDate: now.toISOString(),
        },
        previousPeriod: {
          totalTickets: previousCount,
          startDate: prevStart.toISOString(),
          endDate: currentStart.toISOString(),
        },
        percentageChange,
        isPositive: percentageChange >= 0,
      };
    }

    return {
      totalTickets,
      openTickets,
      closedTickets: totalTickets - openTickets,

      timeframes: {
        "1D": {
          chartData: chartDataByTimeframe["1D"],
          ...percentageChangeByTimeframe["1D"],
        },
        "1W": {
          chartData: chartDataByTimeframe["1W"],
          ...percentageChangeByTimeframe["1W"],
        },
        "1M": {
          chartData: chartDataByTimeframe["1M"],
          ...percentageChangeByTimeframe["1M"],
        },
        "3M": {
          chartData: chartDataByTimeframe["3M"],
          ...percentageChangeByTimeframe["3M"],
        },
      },

      topSupportAgents: topSupportAgents.map((agent) => ({
        userId: agent.performedById,
        ticketsClosed: agent._count,
      })),
      ticketsByCategory: ticketsByCategory.map((cat) => ({
        categoryId: cat.categoryId,
        count: cat._count,
      })),

      totals: {
        activeTickets: openTickets,
      },
    };
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
