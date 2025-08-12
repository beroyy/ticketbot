import { prisma } from "../client";
import { TicketStatus } from "@prisma/client";

interface DateRange {
  start: Date;
  end: Date;
}

interface TicketStatisticsOptions {
  guildId: string;
  dateRange?: DateRange;
  includeDeleted?: boolean;
}

interface StaffPerformanceOptions {
  guildId: string;
  staffId: string;
  dateRange?: DateRange;
}

interface TicketStatistics {
  totalCreated: number;
  totalOpen: number;
  totalClosed: number;
  avgResolutionTime: number | null;
  closureRate: number;
  groupedStats: any;
}

interface StaffPerformance {
  ticketsClosed: number;
  ticketsClaimed: number;
  claimedCount: number;
  closedByUserCount: number;
  transfersGiven: number;
  transfersReceived: number;
  totalActions: number;
  satisfactionRating: number | null;
  feedbackCount: number;
}

/**
 * Get ticket statistics for a guild
 */
export const getTicketStatistics = async (
  options: TicketStatisticsOptions
): Promise<TicketStatistics> => {
  const { guildId, dateRange, includeDeleted = false } = options;
  
  const whereClause: any = {
    guildId,
  };
  
  if (dateRange) {
    whereClause.createdAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }
  
  const [totalCreated, openTickets, closedTickets, avgResolutionData] = await Promise.all([
    // Total created tickets
    prisma.ticket.count({ where: whereClause }),
    
    // Open tickets
    prisma.ticket.count({
      where: {
        ...whereClause,
        status: TicketStatus.OPEN,
      },
    }),
    
    // Closed tickets
    prisma.ticket.count({
      where: {
        ...whereClause,
        status: TicketStatus.CLOSED,
      },
    }),
    
    // Average resolution time (in hours)
    prisma.ticket.aggregate({
      where: {
        ...whereClause,
        status: TicketStatus.CLOSED,
        closedAt: { not: null },
      },
      _avg: {
        id: true, // We'll calculate resolution time differently
      },
    }),
  ]);
  
  // Calculate average resolution time
  // For now, we'll return a placeholder since we need closedAt - createdAt calculation
  const avgResolutionTime = null; // TODO: Implement proper calculation
  
  // Calculate closure rate
  const closureRate = totalCreated > 0 ? (closedTickets / totalCreated) * 100 : 0;
  
  return {
    totalCreated,
    totalOpen: openTickets,
    totalClosed: closedTickets,
    avgResolutionTime,
    closureRate,
    groupedStats: {}, // TODO: Implement grouped statistics
  };
};

/**
 * Get staff performance statistics
 */
export const getStaffPerformance = async (
  options: StaffPerformanceOptions
): Promise<StaffPerformance> => {
  const { guildId, staffId, dateRange } = options;
  
  const whereClause: any = {
    guildId,
  };
  
  if (dateRange) {
    whereClause.createdAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }
  
  // Get tickets closed by this staff member
  // Since closedBy is not directly on ticket, we need to look at lifecycle events
  const closedByUser = await prisma.ticketLifecycleEvent.count({
    where: {
      action: "CLOSED",
      closedById: staffId,
      ticket: whereClause,
    },
  });
  
  // Get tickets currently claimed by this staff member
  const currentlyClaimed = await prisma.ticket.count({
    where: {
      ...whereClause,
      status: TicketStatus.OPEN,
      claimedById: staffId,
    },
  });
  
  // Get all tickets ever claimed by this staff member
  const everClaimed = await prisma.ticket.count({
    where: {
      ...whereClause,
      claimedById: staffId,
    },
  });
  
  // For transfers, we would need to look at events/audit logs
  // For now, we'll return 0 for these
  const transfersGiven = 0;
  const transfersReceived = 0;
  
  // Calculate total actions
  const totalActions = closedByUser + everClaimed;
  
  // Satisfaction rating would come from feedback system
  const satisfactionRating = null;
  const feedbackCount = 0;
  
  return {
    ticketsClosed: closedByUser,
    ticketsClaimed: everClaimed,
    claimedCount: currentlyClaimed,
    closedByUserCount: closedByUser,
    transfersGiven,
    transfersReceived,
    totalActions,
    satisfactionRating,
    feedbackCount,
  };
};

/**
 * Get user ticket statistics
 */
export const getUserTicketStats = async (
  guildId: string,
  userId: string
): Promise<{ openedCount: number; averageResponseTimeMinutes: number }> => {
  const tickets = await prisma.ticket.count({
    where: {
      guildId,
      openerId: userId,
    },
  });
  
  return {
    openedCount: tickets,
    averageResponseTimeMinutes: 0, // TODO: Implement response time calculation
  };
};

/**
 * Get feedback statistics for a guild
 */
export const getFeedbackStats = async (
  guildId: string
): Promise<{ averageRating: number | null; totalFeedback: number }> => {
  // TODO: Implement when feedback system is available
  return {
    averageRating: null,
    totalFeedback: 0,
  };
};