import { prisma } from "../../prisma/client";
import { Prisma, type Event as PrismaEvent, type EventCategory, type EventTargetType } from "@prisma/client";
import { Actor } from "../../context";

export namespace Event {
  export interface CreateData {
    guildId: string;
    actorId: string;
    category: EventCategory;
    action: string;
    targetType: EventTargetType;
    targetId: string;
    ticketId?: number;
    teamRoleId?: number;
    metadata?: unknown;
  }

  export interface ListQuery {
    guildId?: string;
    actorId?: string;
    category?: EventCategory;
    action?: string;
    targetType?: EventTargetType;
    targetId?: string;
    ticketId?: number;
    teamRoleId?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    pagination?: {
      page: number;
      pageSize: number;
    };
  }

  export interface ListResult {
    events: PrismaEvent[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }

  /**
   * Create an event log entry
   */
  export const create = async (data: CreateData): Promise<PrismaEvent> => {
    return prisma.event.create({
      data: {
        guildId: data.guildId,
        actorId: data.actorId,
        category: data.category,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        ticketId: data.ticketId ?? null,
        teamRoleId: data.teamRoleId ?? null,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 7 * 30 * 24 * 60 * 60 * 1000), // 7 months (210 days)
      },
    });
  };

  /**
   * List events with filtering and pagination
   */
  export const list = async (query: ListQuery = {}): Promise<ListResult> => {
    const guildId = query.guildId || Actor.guildId();
    const page = query.pagination?.page || 1;
    const pageSize = query.pagination?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.EventWhereInput = {
      guildId,
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.category && { category: query.category }),
      ...(query.action && { action: query.action }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.targetId && { targetId: query.targetId }),
      ...(query.ticketId && { ticketId: query.ticketId }),
      ...(query.teamRoleId && { teamRoleId: query.teamRoleId }),
      ...(query.dateRange && {
        createdAt: {
          gte: query.dateRange.start,
          lte: query.dateRange.end,
        },
      }),
    };

    // Get events and count in parallel
    const [events, totalCount] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          actor: true,
          ticket: {
            select: {
              number: true,
              subject: true,
            },
          },
          teamRole: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  };

  /**
   * List events for a specific guild (simplified version)
   */
  export const listForGuild = async (
    guildId: string,
    limit: number = 50
  ): Promise<PrismaEvent[]> => {
    return prisma.event.findMany({
      where: { guildId },
      include: {
        actor: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  };

  /**
   * Get events for a specific ticket
   */
  export const listForTicket = async (
    ticketId: number,
    limit?: number
  ): Promise<PrismaEvent[]> => {
    const guildId = Actor.guildId();
    
    return prisma.event.findMany({
      where: {
        guildId,
        ticketId,
      },
      include: {
        actor: true,
      },
      orderBy: { createdAt: "desc" },
      ...(limit && { take: limit }),
    });
  };

  /**
   * Get events for a specific user
   */
  export const listForUser = async (
    userId: string,
    query: Partial<ListQuery> = {}
  ): Promise<PrismaEvent[]> => {
    const guildId = query.guildId || Actor.guildId();
    
    return prisma.event.findMany({
      where: {
        guildId,
        actorId: userId,
        ...(query.category && { category: query.category }),
        ...(query.dateRange && {
          createdAt: {
            gte: query.dateRange.start,
            lte: query.dateRange.end,
          },
        }),
      },
      include: {
        ticket: {
          select: {
            number: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: query.pagination?.pageSize || 50,
    });
  };

  /**
   * Get event statistics for a guild
   */
  export const getStats = async (
    guildId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> => {
    const targetGuildId = guildId || Actor.guildId();
    
    const where: Prisma.EventWhereInput = {
      guildId: targetGuildId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    // Get events grouped by category
    const byCategory = await prisma.event.groupBy({
      by: ["category"],
      where,
      _count: true,
    });

    // Get events grouped by action
    const byAction = await prisma.event.groupBy({
      by: ["action"],
      where,
      _count: true,
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 10, // Top 10 actions
    });

    // Get most active users
    const mostActiveUsers = await prisma.event.groupBy({
      by: ["actorId"],
      where,
      _count: true,
      orderBy: {
        _count: {
          actorId: "desc",
        },
      },
      take: 10,
    });

    return {
      totalEvents: await prisma.event.count({ where }),
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count,
      })),
      topActions: byAction.map(a => ({
        action: a.action,
        count: a._count,
      })),
      mostActiveUsers: mostActiveUsers.map(u => ({
        userId: u.actorId,
        eventCount: u._count,
      })),
    };
  };

  /**
   * Clean up expired events
   */
  export const cleanupExpired = async (): Promise<number> => {
    const result = await prisma.event.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return result.count;
  };
}
