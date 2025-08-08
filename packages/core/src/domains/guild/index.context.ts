import { prisma } from "@ticketsbot/db";
import { Actor, withTransaction, afterTransaction, VisibleError } from "../../context";
import { PermissionFlags } from "../../permissions/constants";
import {
  TicketStatus,
  type Prisma,
  type Guild as _PrismaGuild,
  type GuildRole as _TeamRole,
  type Blacklist as _Blacklist,
} from "@prisma/client";

// Type for the formatted API response
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

/**
 * Context-aware Guild domain methods
 * These methods automatically use actor context for permissions and guild context
 */
export namespace Guild {
  /**
   * Get settings for the current guild
   * Requires GUILD_SETTINGS_VIEW permission
   */
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

  /**
   * Update guild settings
   * Requires GUILD_SETTINGS_EDIT permission
   */
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

    return withTransaction(async () => {
      // First check if guild exists
      const existing = await prisma.guild.findUnique({
        where: { id: guildId },
      });

      if (!existing) {
        throw new VisibleError("not_found", "Guild not found");
      }

      // Build update data
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
        // Handle ticketCategories through junction table
        if (input.settings.ticketCategories !== undefined) {
          // This will be handled separately after the main update
        }
        // Handle supportRoles through junction table
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

      const updated = await prisma.guild.update({
        where: { id: guildId },
        data: updateData,
        include: {
          tags: {
            orderBy: { id: "desc" },
          },
        },
      });

      afterTransaction(async () => {
        console.log(`Guild settings updated for ${guildId}`);
      });

      return formatGuildSettings(updated);
    });
  };

  /**
   * Get team roles for the current guild
   */
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

  /**
   * Get blacklisted users and roles
   * Requires MEMBER_BLACKLIST permission to view
   */
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

  /**
   * Add a user or role to the blacklist
   * Requires MEMBER_BLACKLIST permission
   */
  export const addToBlacklist = async (input: {
    targetId: string;
    isRole: boolean;
    reason?: string;
  }) => {
    Actor.requirePermission(PermissionFlags.MEMBER_BLACKLIST);
    const guildId = Actor.guildId();

    // Check if already blacklisted
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

    afterTransaction(async () => {
      console.log(`Blacklist entry added for ${input.targetId} in guild ${guildId}`);
    });

    return {
      id: entry.id,
      targetId: entry.targetId,
      isRole: entry.isRole,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    };
  };

  /**
   * Remove from blacklist
   * Requires MEMBER_UNBLACKLIST permission
   */
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

    afterTransaction(async () => {
      console.log(`Blacklist entry removed for ${targetId} in guild ${guildId}`);
    });

    return { success: true, removed: deleted.count };
  };

  /**
   * Get statistics for the guild
   * Requires STATS_VIEW permission
   * Returns statistics for all timeframes (1D, 1W, 1M, 3M)
   */
  export const getStatistics = async (): Promise<any> => {
    Actor.requirePermission(PermissionFlags.ANALYTICS_VIEW);
    const guildId = Actor.guildId();

    const now = new Date();

    // Define timeframe configurations
    const timeframeConfigs = {
      "1D": { days: 1, bucketSize: "hour", bucketCount: 24 },
      "1W": { days: 7, bucketSize: "day", bucketCount: 7 },
      "1M": { days: 30, bucketSize: "day", bucketCount: 30 },
      "3M": { days: 90, bucketSize: "week", bucketCount: 13 },
    };

    // Generate buckets for each timeframe
    const generateBuckets = (timeframe: keyof typeof timeframeConfigs) => {
      const config = timeframeConfigs[timeframe];
      const buckets: { start: Date; end: Date; date: string }[] = [];
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - config.days);

      if (config.bucketSize === "hour") {
        // For 1D: Generate hourly buckets
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
        // For 1W and 1M: Generate daily buckets
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
        // For 3M: Generate weekly buckets
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

    // Generate all bucket sets
    const allBuckets = {
      "1D": generateBuckets("1D"),
      "1W": generateBuckets("1W"),
      "1M": generateBuckets("1M"),
      "3M": generateBuckets("3M"),
    };

    // Query data for all timeframes in parallel
    const [totalTickets, openTickets, topSupportAgents, ticketsByCategory, allBucketCounts] =
      await Promise.all([
        // Total tickets all time
        prisma.ticket.count({
          where: { guildId },
        }),

        // Currently open tickets
        prisma.ticket.count({
          where: {
            guildId,
            status: TicketStatus.OPEN,
          },
        }),

        // Top support agents (last 30 days) - Updated to use lifecycle events
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

        // Tickets by category (last 30 days)
        prisma.ticket.groupBy({
          by: ["categoryId"],
          where: {
            guildId,
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
          _count: true,
        }),

        // Chart data for all timeframes
        Promise.all(
          Object.entries(allBuckets).map(async ([timeframe, buckets]) => {
            const counts = await Promise.all(
              buckets.map((bucket) =>
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

    // Organize bucket counts by timeframe
    const bucketCountsByTimeframe: Record<string, number[]> = {};
    allBucketCounts.forEach(({ timeframe, counts }) => {
      bucketCountsByTimeframe[timeframe] = counts;
    });

    // Format chart data for each timeframe
    const chartDataByTimeframe: Record<string, any[]> = {};
    const periodDataByTimeframe: Record<string, any> = {};

    Object.entries(allBuckets).forEach(([timeframe, buckets]) => {
      const counts = bucketCountsByTimeframe[timeframe] || [];

      // Format chart data
      chartDataByTimeframe[timeframe] = buckets.map((bucket, index) => ({
        date: bucket.date,
        tickets: counts[index] || 0,
      }));

      // Calculate period totals for each timeframe
      const periodTotal = counts.reduce((sum, count) => sum + count, 0);

      // Calculate comparison periods
      const config = timeframeConfigs[timeframe as keyof typeof timeframeConfigs];
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - config.days);

      // Previous period for comparison
      const prevPeriodStart = new Date(periodStart);
      prevPeriodStart.setDate(prevPeriodStart.getDate() - config.days);

      // Query previous period count for percentage change
      periodDataByTimeframe[timeframe] = {
        totalTickets: periodTotal,
        startDate: periodStart.toISOString(),
        endDate: now.toISOString(),
      };
    });

    // Calculate percentage changes for each timeframe
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
      // Basic counts (always available)
      totalTickets,
      openTickets,
      closedTickets: totalTickets - openTickets,

      // Data organized by timeframe
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

      // Additional analytics (30-day window)
      topSupportAgents: topSupportAgents.map((agent) => ({
        userId: agent.performedById,
        ticketsClosed: agent._count,
      })),
      ticketsByCategory: ticketsByCategory.map((cat) => ({
        categoryId: cat.categoryId,
        count: cat._count,
      })),

      // For frontend compatibility
      totals: {
        activeTickets: openTickets,
      },
    };
  };
}

// Helper functions

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
