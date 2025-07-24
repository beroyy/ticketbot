import { prisma } from "../../prisma/client";
import { TicketStatus, Prisma } from "@prisma/client";
import { Actor } from "../../context";

// Date utility functions
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const subDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
};

const differenceInHours = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
};

const differenceInMinutes = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
};

// Import types
import type {
  TicketStatsQuery,
  StaffPerformanceQuery,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TicketTrends,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  RealtimeStats,
  GenerateReportInput,
} from "./schemas";

// Export schemas
export {
  AnalyticsSnapshotSchema,
  TicketStatsQuerySchema,
  CrossEntityStatsQuerySchema,
  StaffPerformanceQuerySchema,
  PanelPerformanceSchema,
  TicketTrendsSchema,
  RealtimeStatsSchema,
  GenerateReportSchema,
  type AnalyticsSnapshot,
  type TicketStatsQuery,
  type CrossEntityStatsQuery,
  type StaffPerformanceQuery,
  type PanelPerformance,
  type TicketTrends,
  type RealtimeStats,
  type GenerateReportInput,
} from "./schemas";

/**
 * Analytics domain - handles statistics, reporting, and performance metrics
 */
export namespace Analytics {
  /**
   * Get ticket statistics for a guild
   */
  export const getTicketStatistics = async (query: TicketStatsQuery): Promise<any> => {
    const { TicketStatsQuerySchema } = await import("./schemas");
    const parsed = TicketStatsQuerySchema.parse(query);
    const guildId = parsed.guildId || Actor.guildId();

    // Build date range filter
    const dateFilter = parsed.dateRange
      ? {
          createdAt: {
            gte: parsed.dateRange.start,
            lte: parsed.dateRange.end,
          },
        }
      : {};

    // Get basic stats
    const [totalOpen, totalClosed, totalCreated] = await Promise.all([
      prisma.ticket.count({
        where: {
          guildId,
          status: TicketStatus.OPEN,
          deletedAt: parsed.includeDeleted ? undefined : null,
          ...dateFilter,
        },
      }),
      prisma.ticket.count({
        where: {
          guildId,
          status: TicketStatus.CLOSED,
          deletedAt: parsed.includeDeleted ? undefined : null,
          ...dateFilter,
        },
      }),
      prisma.ticket.count({
        where: {
          guildId,
          deletedAt: parsed.includeDeleted ? undefined : null,
          ...dateFilter,
        },
      }),
    ]);

    // Get grouped stats if requested
    let groupedStats = null;
    if (parsed.groupBy) {
      switch (parsed.groupBy) {
        case "panel":
          groupedStats = await getStatsByPanel(guildId, dateFilter);
          break;
        case "staff":
          groupedStats = await getStatsByStaff(guildId, dateFilter);
          break;
        case "category":
          groupedStats = await getStatsByCategory(guildId, dateFilter);
          break;
        case "day":
        case "week":
        case "month":
          groupedStats = await getStatsByTime(guildId, parsed.groupBy, dateFilter);
          break;
      }
    }

    // Calculate average resolution time
    const closedTickets = await prisma.ticket.findMany({
      where: {
        guildId,
        status: TicketStatus.CLOSED,
        closedAt: { not: null },
        deletedAt: parsed.includeDeleted ? undefined : null,
        ...dateFilter,
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
    });

    const resolutionTimes = closedTickets
      .filter((t) => t.closedAt)
      .map((t) => differenceInHours(t.closedAt!, t.createdAt));

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : null;

    return {
      totalOpen,
      totalClosed,
      totalCreated,
      avgResolutionTime,
      closureRate: totalCreated > 0 ? (totalClosed / totalCreated) * 100 : 0,
      groupedStats,
    };
  };

  /**
   * Get real-time statistics
   */
  export const getRealtimeStats = async (guildId?: string): Promise<any> => {
    const targetGuildId = guildId || Actor.guildId();
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Get current stats
    const [currentOpen, todayCreated, todayClosed] = await Promise.all([
      prisma.ticket.count({
        where: {
          guildId: targetGuildId,
          status: TicketStatus.OPEN,
          deletedAt: null,
        },
      }),
      prisma.ticket.count({
        where: {
          guildId: targetGuildId,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
          deletedAt: null,
        },
      }),
      prisma.ticket.count({
        where: {
          guildId: targetGuildId,
          status: TicketStatus.CLOSED,
          closedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
          deletedAt: null,
        },
      }),
    ]);

    // Calculate average wait time for open tickets
    const openTickets = await prisma.ticket.findMany({
      where: {
        guildId: targetGuildId,
        status: TicketStatus.OPEN,
        deletedAt: null,
      },
      select: {
        createdAt: true,
        lifecycleEvents: {
          where: { action: "claimed" },
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    const waitTimes = openTickets
      .filter((t) => t.lifecycleEvents.length === 0)
      .map((t) => differenceInMinutes(new Date(), t.createdAt));

    const avgWaitTime =
      waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : null;

    // Count staff with recent activity
    const staffOnline = await prisma.ticketLifecycleEvent.groupBy({
      by: ["performedById"],
      where: {
        timestamp: {
          gte: subDays(new Date(), 1), // Active in last 24 hours
        },
        ticket: {
          guildId: targetGuildId,
        },
      },
      _count: true,
    });

    return {
      guildId: targetGuildId,
      currentOpen,
      todayCreated,
      todayClosed,
      avgWaitTime,
      staffOnline: staffOnline.length,
      queueLength: openTickets.filter((t) => t.lifecycleEvents.length === 0).length,
    };
  };

  /**
   * Get staff performance metrics
   */
  export const getStaffPerformance = async (query: StaffPerformanceQuery): Promise<any> => {
    const { StaffPerformanceQuerySchema } = await import("./schemas");
    const parsed = StaffPerformanceQuerySchema.parse(query);
    const guildId = parsed.guildId || Actor.guildId();

    const dateFilter = parsed.dateRange
      ? {
          timestamp: {
            gte: parsed.dateRange.start,
            lte: parsed.dateRange.end,
          },
        }
      : {};

    // Get all staff or specific staff
    const staffFilter = parsed.staffId ? { performedById: parsed.staffId } : {};

    // Get lifecycle events for performance calculation
    const events = await prisma.ticketLifecycleEvent.findMany({
      where: {
        ticket: { guildId },
        ...staffFilter,
        ...dateFilter,
      },
      include: {
        ticket: {
          select: {
            createdAt: true,
            closedAt: true,
          },
        },
      },
    });

    // Group by staff
    const staffMetrics = new Map<string, any>();

    for (const event of events) {
      const staffId = event.performedById;
      if (!staffMetrics.has(staffId)) {
        staffMetrics.set(staffId, {
          staffId,
          ticketsClaimed: 0,
          ticketsClosed: 0,
          responseTimes: [],
          resolutionTimes: [],
        });
      }

      const metrics = staffMetrics.get(staffId)!;

      if (event.action === "claimed") {
        metrics.ticketsClaimed++;
        // Calculate response time
        const responseTime = differenceInMinutes(event.timestamp, event.ticket.createdAt);
        metrics.responseTimes.push(responseTime);
      } else if (event.action === "closed") {
        metrics.ticketsClosed++;
        // Calculate resolution time if applicable
        if (event.ticket.closedAt) {
          const resolutionTime = differenceInHours(event.ticket.closedAt, event.ticket.createdAt);
          metrics.resolutionTimes.push(resolutionTime);
        }
      }
    }

    // Calculate averages and get feedback ratings
    const results = [];
    for (const [staffId, metrics] of staffMetrics) {
      const avgResponseTime =
        metrics.responseTimes.length > 0
          ? metrics.responseTimes.reduce((a: number, b: number) => a + b, 0) /
            metrics.responseTimes.length
          : null;

      const avgResolutionTime =
        metrics.resolutionTimes.length > 0
          ? metrics.resolutionTimes.reduce((a: number, b: number) => a + b, 0) /
            metrics.resolutionTimes.length
          : null;

      // Get satisfaction ratings for tickets closed by this staff
      const feedbackData = await prisma.ticketFeedback.aggregate({
        where: {
          transcript: {
            ticket: {
              guildId,
              lifecycleEvents: {
                some: {
                  action: "closed",
                  closedById: staffId,
                },
              },
            },
          },
        },
        _avg: {
          rating: true,
        },
        _count: true,
      });

      results.push({
        staffId,
        ticketsClaimed: metrics.ticketsClaimed,
        ticketsClosed: metrics.ticketsClosed,
        avgResponseTime,
        avgResolutionTime,
        satisfactionRating: feedbackData._avg.rating,
        feedbackCount: feedbackData._count,
      });
    }

    return parsed.staffId ? results[0] : results;
  };

  /**
   * Get ticket trends over time
   */
  export const getTicketTrends = async (
    guildId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> => {
    const targetGuildId = guildId || Actor.guildId();
    const range = dateRange || {
      start: subDays(new Date(), 30),
      end: new Date(),
    };

    // Get tickets in range
    const tickets = await prisma.ticket.findMany({
      where: {
        guildId: targetGuildId,
        createdAt: {
          gte: range.start,
          lte: range.end,
        },
        deletedAt: null,
      },
      select: {
        createdAt: true,
        closedAt: true,
        status: true,
      },
    });

    // Group by day
    const dailyData = new Map<string, any>();

    for (const ticket of tickets) {
      const dateKey = startOfDay(ticket.createdAt).toISOString();

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: new Date(dateKey),
          created: 0,
          closed: 0,
          resolutionTimes: [],
        });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.created++;

      if (ticket.status === TicketStatus.CLOSED && ticket.closedAt) {
        const closedDateKey = startOfDay(ticket.closedAt).toISOString();
        if (dailyData.has(closedDateKey)) {
          dailyData.get(closedDateKey)!.closed++;
        }

        const resolutionTime = differenceInHours(ticket.closedAt, ticket.createdAt);
        dayData.resolutionTimes.push(resolutionTime);
      }
    }

    // Convert to array and calculate averages
    const data = Array.from(dailyData.values())
      .map((day) => ({
        date: day.date,
        created: day.created,
        closed: day.closed,
        avgResolutionTime:
          day.resolutionTimes.length > 0
            ? day.resolutionTimes.reduce((a: number, b: number) => a + b, 0) /
              day.resolutionTimes.length
            : null,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate summary
    const totalCreated = data.reduce((sum, day) => sum + day.created, 0);
    const totalClosed = data.reduce((sum, day) => sum + day.closed, 0);
    const closureRate = totalCreated > 0 ? (totalClosed / totalCreated) * 100 : 0;

    // Determine trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.created, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.created, 0) / secondHalf.length;

    const trend =
      secondHalfAvg > firstHalfAvg * 1.1
        ? "increasing"
        : secondHalfAvg < firstHalfAvg * 0.9
          ? "decreasing"
          : "stable";

    return {
      period: range,
      data,
      summary: {
        totalCreated,
        totalClosed,
        closureRate,
        trend,
      },
    };
  };

  /**
   * Create or update daily analytics snapshot
   */
  export const createSnapshot = async (guildId: string, date: Date): Promise<void> => {
    const targetDate = startOfDay(date);
    const dateEnd = endOfDay(date);

    // Calculate stats for the day
    const stats = await getTicketStatistics({
      guildId,
      dateRange: { start: targetDate, end: dateEnd },
      groupBy: "panel",
      includeDeleted: false,
    });

    const staffStats = await getStaffPerformance({
      guildId,
      dateRange: { start: targetDate, end: dateEnd },
    });

    // Upsert snapshot
    await prisma.ticketAnalyticsSnapshot.upsert({
      where: {
        guildId_date: {
          guildId,
          date: targetDate,
        },
      },
      create: {
        guildId,
        date: targetDate,
        totalOpen: stats.totalOpen,
        totalClosed: stats.totalClosed,
        totalCreated: stats.totalCreated,
        avgResolutionTime: stats.avgResolutionTime,
        avgResponseTime: calculateAvgResponseTime(staffStats),
        byPanel: stats.groupedStats,
        byStaff: staffStats,
        byCategory: Prisma.JsonNull,
      },
      update: {
        totalOpen: stats.totalOpen,
        totalClosed: stats.totalClosed,
        totalCreated: stats.totalCreated,
        avgResolutionTime: stats.avgResolutionTime,
        avgResponseTime: calculateAvgResponseTime(staffStats),
        byPanel: stats.groupedStats,
        byStaff: staffStats,
      },
    });
  };

  /**
   * Generate analytics report
   */
  export const generateReport = async (input: GenerateReportInput): Promise<any> => {
    const { GenerateReportSchema } = await import("./schemas");
    const parsed = GenerateReportSchema.parse(input);
    const guildId = parsed.guildId || Actor.guildId();

    // Determine date range based on report type
    let dateRange = parsed.dateRange;
    if (!dateRange) {
      const now = new Date();
      switch (parsed.reportType) {
        case "daily":
          dateRange = { start: startOfDay(now), end: endOfDay(now) };
          break;
        case "weekly":
          dateRange = { start: subDays(now, 7), end: now };
          break;
        case "monthly":
          dateRange = { start: subDays(now, 30), end: now };
          break;
        default:
          throw new Error("Date range required for custom reports");
      }
    }

    const report: any = {
      guildId,
      reportType: parsed.reportType,
      dateRange,
      generatedAt: new Date(),
      sections: {},
    };

    const sections = parsed.includeSections || ["overview", "ticket_trends", "staff_performance"];

    // Build requested sections
    for (const section of sections) {
      switch (section) {
        case "overview":
          report.sections.overview = await getTicketStatistics({
            guildId,
            dateRange,
            includeDeleted: false,
          });
          break;

        case "ticket_trends":
          report.sections.ticketTrends = await getTicketTrends(
            guildId,
            dateRange && dateRange.start && dateRange.end
              ? (dateRange as { start: Date; end: Date })
              : undefined
          );
          break;

        case "staff_performance":
          report.sections.staffPerformance = await getStaffPerformance({
            guildId,
            dateRange,
          });
          break;

        case "panel_breakdown":
          report.sections.panelBreakdown = await getTicketStatistics({
            guildId,
            dateRange,
            groupBy: "panel",
            includeDeleted: false,
          });
          break;

        case "satisfaction_scores":
          report.sections.satisfaction = await getSatisfactionScores(guildId, dateRange);
          break;

        case "response_times":
          report.sections.responseTimes = await getResponseTimeAnalysis(guildId, dateRange);
          break;
      }
    }

    // Format based on requested format
    switch (parsed.format) {
      case "csv":
        return formatReportAsCsv(report);
      case "pdf":
        throw new Error("PDF export not yet implemented");
      default:
        return report;
    }
  };
}

// Helper functions
async function getStatsByPanel(guildId: string, dateFilter: any): Promise<any> {
  const stats = await prisma.ticket.groupBy({
    by: ["panelId"],
    where: {
      guildId,
      deletedAt: null,
      ...dateFilter,
    },
    _count: {
      _all: true,
    },
  });

  return stats.map((s) => ({
    panelId: s.panelId,
    count: s._count._all,
  }));
}

async function getStatsByStaff(guildId: string, dateFilter: any): Promise<any> {
  const events = await prisma.ticketLifecycleEvent.groupBy({
    by: ["performedById", "action"],
    where: {
      ticket: {
        guildId,
        ...dateFilter,
      },
      action: { in: ["claimed", "closed"] },
    },
    _count: true,
  });

  const staffMap = new Map<string, any>();

  for (const event of events) {
    if (!staffMap.has(event.performedById)) {
      staffMap.set(event.performedById, { claimed: 0, closed: 0 });
    }

    const stats = staffMap.get(event.performedById)!;
    if (event.action === "claimed") {
      stats.claimed = event._count;
    } else if (event.action === "closed") {
      stats.closed = event._count;
    }
  }

  return Array.from(staffMap.entries()).map(([staffId, stats]) => ({
    staffId,
    ...stats,
  }));
}

async function getStatsByCategory(guildId: string, dateFilter: any): Promise<any> {
  const stats = await prisma.ticket.groupBy({
    by: ["categoryId"],
    where: {
      guildId,
      deletedAt: null,
      ...dateFilter,
    },
    _count: {
      _all: true,
    },
  });

  return stats.map((s) => ({
    categoryId: s.categoryId,
    count: s._count._all,
  }));
}

async function getStatsByTime(
  guildId: string,
  groupBy: "day" | "week" | "month",
  dateFilter: any
): Promise<any> {
  const result = await prisma.$queryRaw<
    Array<{
      period: Date;
      total: bigint;
      closed: bigint;
      open: bigint;
      claimed: bigint;
      avg_resolution_time: number | null;
    }>
  >`
    SELECT 
      DATE_TRUNC(${groupBy}, created_at) as period,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed,
      COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open,
      COUNT(CASE WHEN status = 'CLAIMED' THEN 1 END) as claimed,
      ROUND(AVG(
        CASE 
          WHEN status = 'CLOSED' AND closed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (closed_at - created_at)) / 60
          ELSE NULL 
        END
      )) as avg_resolution_time
    FROM tickets
    WHERE guild_id = ${guildId}
      AND created_at >= ${dateFilter.start}
      AND created_at <= ${dateFilter.end}
      AND deleted_at IS NULL
    GROUP BY DATE_TRUNC(${groupBy}, created_at)
    ORDER BY period ASC
  `;

  // Format the result for consistent output
  return result.map((row) => ({
    period: row.period.toISOString().split("T")[0],
    total: Number(row.total),
    open: Number(row.open),
    closed: Number(row.closed),
    claimed: Number(row.claimed),
    avgResolutionTime: row.avg_resolution_time ? Number(row.avg_resolution_time) : null,
  }));
}

function calculateAvgResponseTime(staffStats: any[]): number | null {
  const allResponseTimes = staffStats
    .filter((s) => s.avgResponseTime !== null)
    .map((s) => s.avgResponseTime);

  return allResponseTimes.length > 0
    ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
    : null;
}

async function getSatisfactionScores(guildId: string, dateRange: any): Promise<any> {
  const feedback = await prisma.ticketFeedback.aggregate({
    where: {
      transcript: {
        ticket: {
          guildId,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      },
    },
    _avg: {
      rating: true,
    },
    _count: true,
  });

  const distribution = await prisma.ticketFeedback.groupBy({
    by: ["rating"],
    where: {
      transcript: {
        ticket: {
          guildId,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      },
    },
    _count: true,
  });

  return {
    averageRating: feedback._avg.rating,
    totalFeedback: feedback._count,
    distribution: distribution.map((d) => ({
      rating: d.rating,
      count: d._count,
    })),
  };
}

async function getResponseTimeAnalysis(guildId: string, dateRange: any): Promise<any> {
  // Get all claim events in date range
  const claimEvents = await prisma.ticketLifecycleEvent.findMany({
    where: {
      action: "claimed",
      ticket: {
        guildId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    },
    include: {
      ticket: {
        select: {
          createdAt: true,
        },
      },
    },
  });

  const responseTimes = claimEvents.map((event) => ({
    minutes: differenceInMinutes(event.timestamp, event.ticket.createdAt),
    claimedBy: event.claimedById,
  }));

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt.minutes, 0) / responseTimes.length
      : null;

  // Calculate percentiles
  const sorted = responseTimes.map((rt) => rt.minutes).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || null;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || null;

  return {
    avgResponseTime,
    medianResponseTime: p50,
    p95ResponseTime: p95,
    totalClaims: claimEvents.length,
  };
}

function formatReportAsCsv(report: any): string {
  // Simple CSV formatting - would need enhancement for production
  let csv = "Metric,Value\n";

  if (report.sections.overview) {
    csv += `Total Open,${report.sections.overview.totalOpen}\n`;
    csv += `Total Closed,${report.sections.overview.totalClosed}\n`;
    csv += `Total Created,${report.sections.overview.totalCreated}\n`;
    csv += `Avg Resolution Time (hours),${report.sections.overview.avgResolutionTime || "N/A"}\n`;
  }

  return csv;
}
