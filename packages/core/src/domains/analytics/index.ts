import { prisma, TicketStatus } from "@ticketsbot/db";
import { Actor } from "../../context";
import type { StaffPerformanceQuery } from "./schemas";

const differenceInHours = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
};

const differenceInMinutes = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60);
};

import type { TicketStatsQuery } from "./schemas";

export { TicketStatsQuerySchema, type TicketStatsQuery } from "./schemas";

export namespace Analytics {
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
      .filter((t: { createdAt: Date; closedAt: Date | null }) => t.closedAt)
      .map((t: { createdAt: Date; closedAt: Date | null }) =>
        differenceInHours(t.closedAt!, t.createdAt)
      );

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length
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
}

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

  return stats.map((s: { panelId: number | null; _count: { _all: number } }) => ({
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

  return stats.map((s: { categoryId: string | null; _count: { _all: number } }) => ({
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

  return result.map((row: any) => ({
    period: row.period.toISOString().split("T")[0],
    total: Number(row.total),
    open: Number(row.open),
    closed: Number(row.closed),
    claimed: Number(row.claimed),
    avgResolutionTime: row.avg_resolution_time ? Number(row.avg_resolution_time) : null,
  }));
}
