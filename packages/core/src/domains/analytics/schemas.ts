import { z } from "zod";
import { DiscordGuildIdSchema, DiscordUserIdSchema, DateRangeSchema } from "../../utils/common";

export const TicketStatsQuerySchema = z.object({
  guildId: DiscordGuildIdSchema,
  dateRange: DateRangeSchema.optional(),
  groupBy: z.enum(["day", "week", "month", "panel", "staff", "category"]).optional(),
  includeDeleted: z.boolean().default(false),
});

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

export type TicketStatsQuery = z.infer<typeof TicketStatsQuerySchema>;
export type StaffPerformanceQuery = z.infer<typeof StaffPerformanceQuerySchema>;
export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
