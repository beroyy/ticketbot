import { z } from "zod";
import { DiscordGuildIdSchema, DiscordChannelIdSchema, TicketStatusSchema } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";
import { ApiErrors } from "../../utils/error-handler";

export const _TicketDashboardResponse = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(["open", "closed"]),
  priority: z.enum(["low", "medium", "high"]),
  assignee: z.string().nullable(),
  assigneeAvatar: z.string().nullable(),
  assigneeImage: z.string().nullable(),
  urgency: z.string(),
  awaitingResponse: z.enum(["Yes", "No"]),
  lastMessage: z.string(),
  createdAt: z.string(),
  progress: z.number().min(0).max(100),
  subject: z.string().nullable(),
  opener: z.string(),
  openerAvatar: z.string().nullable(),
  openerImage: z.string().nullable(),
  openerDiscordId: z.string(),
  openerMetadata: z.record(z.string(), z.any()).nullable(),
  sentimentScore: z.number().nullable(),
  summary: z.string().nullable(),
  embedding: z.unknown(),
});

export const _ActivityEntry = z.object({
  id: z.union([z.string(), z.number()]),
  timestamp: z.string(),
  action: z.string(),
  type: z.enum(["lifecycle", "transcript"]),
  details: z.record(z.string(), z.any()).nullable(),
  performedBy: z
    .object({
      id: z.string(),
      username: z.string(),
      global_name: z.string(),
    })
    .nullable(),
});

export const _TicketMessage = z.object({
  id: z.union([z.string(), z.number()]),
  content: z.string().nullable(),
  timestamp: z.string(),
  author: z
    .object({
      id: z.string(),
      username: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  ticketId: z.number(),
  isInternal: z.boolean(),
});

export const _TicketStatistics = z.object({
  totalTickets: z.number(),
  openTickets: z.number(),
  closedTickets: z.number(),
  avgResponseTime: z.number().nullable(),
  closureRate: z.number(),
  groupedStats: z.any(),
});

export const CreateTicketSchema = z.object({
  guildId: DiscordGuildIdSchema,
  panelId: z.number().positive().optional(),
  subject: z.string().min(1).max(100),
  categoryId: DiscordChannelIdSchema.optional(),
  openerId: DiscordGuildIdSchema,
  initialMessage: z.string().optional(),
  formResponses: z.record(z.string(), z.string()).optional(),
});

export const UpdateTicketSchema = z.object({
  subject: z.string().min(1).max(100).optional(),
  status: TicketStatusSchema.optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  categoryId: DiscordChannelIdSchema.optional(),
  sentimentScore: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
});

export const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().optional().default(false),
});

export const parseTicketId = (id: string): number => {
  if (!id) throw ApiErrors.badRequest("Ticket ID is required");

  const decodedId = decodeURIComponent(id);
  const cleanId = decodedId.startsWith("#") ? decodedId.substring(1) : decodedId;
  const ticketId = parseInt(cleanId, 10);

  if (isNaN(ticketId)) throw ApiErrors.badRequest("Invalid ticket ID format");

  return ticketId;
};

export const formatTicketForDashboard = async (
  ticket: any
): Promise<z.infer<typeof _TicketDashboardResponse>> => {
  let progress = 0;
  if (ticket.sentimentScore !== null) {
    progress = Math.round(ticket.sentimentScore);
  } else {
    if (ticket.status === "closed") {
      progress = 100;
    } else {
      try {
        const currentClaim = await db.ticket.getCurrentClaim(ticket.id);
        progress = currentClaim ? 75 : 25;
      } catch {
        progress = 25;
      }
    }
  }

  let messageCount = 0;
  try {
    const messages = await db.transcript.getMessages(ticket.id);
    messageCount = messages.length;
  } catch {
    messageCount = 0;
  }

  let urgency = "Low";
  if (messageCount > 20) urgency = "High";
  else if (messageCount > 10) urgency = "Medium";

  const daysSinceCreated = Math.floor(
    (Date.now() - ticket.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let lastMessage = "Never";
  if (daysSinceCreated === 0) lastMessage = "Today";
  else if (daysSinceCreated === 1) lastMessage = "1 day ago";
  else if (daysSinceCreated < 30) lastMessage = `${daysSinceCreated} days ago`;
  else lastMessage = "Last month";

  return {
    id: `#${ticket.id}`,
    type: ticket.panel?.title || "General Support",
    status: ticket.status,
    priority: urgency.toLowerCase() as "low" | "medium" | "high",
    assignee: ticket.claimedBy?.username || null,
    assigneeAvatar: ticket.claimedBy?.username?.[0]?.toUpperCase() || null,
    assigneeImage: ticket.claimedBy?.avatarUrl || null,
    urgency: `${Math.min(10, Math.max(1, messageCount))}/10`,
    awaitingResponse: messageCount > 0 ? "Yes" : "No",
    lastMessage,
    createdAt: ticket.createdAt.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    }),
    progress,
    subject: ticket.subject || "",
    opener: ticket.opener.username,
    openerAvatar: ticket.opener.username?.[0]?.toUpperCase() || null,
    openerImage: ticket.opener.avatarUrl || null,
    openerDiscordId: ticket.openerId.toString(),
    openerMetadata: ticket.opener.metadata || null,
    sentimentScore: ticket.sentimentScore,
    summary: ticket.summary,
    embedding: ticket.embedding,
  };
};
