import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordUserIdSchema,
  DateRangeSchema,
  JsonMetadataSchema,
} from "../../schemas/common";

/**
 * Analytics snapshot schema
 */
export const AnalyticsSnapshotSchema = z.object({
  id: z.number(),
  guildId: DiscordGuildIdSchema,
  date: z.date(),
  totalOpen: z.number().int().min(0),
  totalClosed: z.number().int().min(0),
  totalCreated: z.number().int().min(0),
  avgResolutionTime: z.number().min(0).nullable(), // In hours
  avgResponseTime: z.number().min(0).nullable(), // In minutes
  byPanel: JsonMetadataSchema.nullable(),
  byStaff: JsonMetadataSchema.nullable(),
  byCategory: JsonMetadataSchema.nullable(),
  createdAt: z.date(),
});

/**
 * Ticket statistics query schema
 */
export const TicketStatsQuerySchema = z.object({
  guildId: DiscordGuildIdSchema,
  dateRange: DateRangeSchema.optional(),
  groupBy: z.enum(["day", "week", "month", "panel", "staff", "category"]).optional(),
  includeDeleted: z.boolean().default(false),
});

/**
 * Cross-entity statistics query schema
 */
export const CrossEntityStatsQuerySchema = z.object({
  guildId: DiscordGuildIdSchema,
  dateRange: DateRangeSchema.optional(),
  includeTickets: z.boolean().default(true),
  includeEvents: z.boolean().default(false),
  includePanels: z.boolean().default(false),
  includeTags: z.boolean().default(false),
});

/**
 * Staff performance query schema
 */
export const StaffPerformanceQuerySchema = z.object({
  guildId: DiscordGuildIdSchema,
  staffId: DiscordUserIdSchema.optional(),
  dateRange: DateRangeSchema.optional(),
  metrics: z
    .array(
      z.enum([
        "tickets_claimed",
        "tickets_closed",
        "avg_response_time",
        "avg_resolution_time",
        "satisfaction_rating",
        "messages_sent",
      ])
    )
    .optional(),
});

/**
 * Panel performance schema
 */
export const PanelPerformanceSchema = z.object({
  panelId: z.number(),
  totalTickets: z.number(),
  avgResolutionTime: z.number().nullable(),
  satisfactionScore: z.number().min(0).max(5).nullable(),
  topCategories: z.array(
    z.object({
      category: z.string(),
      count: z.number(),
    })
  ),
});

/**
 * Ticket trends schema
 */
export const TicketTrendsSchema = z.object({
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  data: z.array(
    z.object({
      date: z.date(),
      created: z.number(),
      closed: z.number(),
      avgResolutionTime: z.number().nullable(),
    })
  ),
  summary: z.object({
    totalCreated: z.number(),
    totalClosed: z.number(),
    closureRate: z.number(), // Percentage
    trend: z.enum(["increasing", "decreasing", "stable"]),
  }),
});

/**
 * Real-time statistics schema
 */
export const RealtimeStatsSchema = z.object({
  guildId: DiscordGuildIdSchema,
  currentOpen: z.number(),
  todayCreated: z.number(),
  todayClosed: z.number(),
  avgWaitTime: z.number().nullable(), // In minutes
  staffOnline: z.number(),
  queueLength: z.number(),
});

/**
 * Generate analytics report schema
 */
export const GenerateReportSchema = z.object({
  guildId: DiscordGuildIdSchema,
  reportType: z.enum(["daily", "weekly", "monthly", "custom"]),
  dateRange: DateRangeSchema.optional(),
  includeSections: z
    .array(
      z.enum([
        "overview",
        "ticket_trends",
        "staff_performance",
        "panel_breakdown",
        "satisfaction_scores",
        "response_times",
      ])
    )
    .optional(),
  format: z.enum(["json", "csv", "pdf"]).default("json"),
});

/**
 * Type inference helpers
 */
export type AnalyticsSnapshot = z.infer<typeof AnalyticsSnapshotSchema>;
export type TicketStatsQuery = z.infer<typeof TicketStatsQuerySchema>;
export type CrossEntityStatsQuery = z.infer<typeof CrossEntityStatsQuerySchema>;
export type StaffPerformanceQuery = z.infer<typeof StaffPerformanceQuerySchema>;
export type PanelPerformance = z.infer<typeof PanelPerformanceSchema>;
export type TicketTrends = z.infer<typeof TicketTrendsSchema>;
export type RealtimeStats = z.infer<typeof RealtimeStatsSchema>;
export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
