export interface Ticket {
  id: string;
  type: string;
  status: string;
  priority: string;
  assignee: string | null;
  assigneeAvatar: string | null;
  assigneeImage?: string | null;
  urgency: string;
  awaitingResponse: string;
  lastMessage: string;
  createdAt: string;
  progress: number; // Derived from sentimentScore (0..100) or status-based fallback
  subject?: string | null;
  opener?: string;
  openerAvatar?: string | null;
  openerImage?: string | null;
  openerDiscordId?: string | null;
  openerMetadata?: unknown;
  // AI-related fields from database
  sentimentScore?: number | null;
  summary?: string | null;
  embedding?: string | null;
}

export interface TicketStatsData {
  date: string;
  tickets: number;
}

export interface TimeframeStats {
  chartData: TicketStatsData[];
  currentPeriod: {
    totalTickets: number;
    startDate: string;
    endDate: string;
  };
  previousPeriod: {
    totalTickets: number;
    startDate: string;
    endDate: string;
  };
  percentageChange: number;
  isPositive: boolean;
}

export interface TicketStats {
  // Basic counts (always available)
  totalTickets: number;
  openTickets: number;
  closedTickets: number;

  // Data organized by timeframe
  timeframes: {
    "1D": TimeframeStats;
    "1W": TimeframeStats;
    "1M": TimeframeStats;
    "3M": TimeframeStats;
  };

  // Additional analytics (30-day window)
  topSupportAgents: Array<{
    userId: string;
    ticketsClosed: number;
  }>;
  ticketsByCategory: Array<{
    categoryId: string | null;
    count: number;
  }>;

  // For frontend compatibility
  totals: {
    activeTickets: number;
  };
}

export interface TicketMessage {
  id: number;
  messageId: string;
  content: string;
  embeds: Record<string, unknown>[] | null;
  attachments: Record<string, unknown>[] | null;
  messageType: string;
  referenceId: string | null;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
    metadata: unknown;
  };
}

export interface TicketMessagesResponse {
  messages: TicketMessage[];
}
