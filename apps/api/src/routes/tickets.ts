import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  TicketStatusSchema,
  PermissionFlags,
} from "@ticketsbot/core";
import { Ticket, TicketLifecycle, Transcripts, Analytics, User } from "@ticketsbot/core/domains";
import { createRoute, ApiErrors } from "../factory";
import { compositions, requirePermission } from "../middleware/context";

// Response schemas
const _TicketDashboardResponse = z.object({
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

const _ActivityEntry = z.object({
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

const _TicketMessage = z.object({
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

const _TicketStatistics = z.object({
  totalTickets: z.number(),
  openTickets: z.number(),
  closedTickets: z.number(),
  avgResponseTime: z.number().nullable(),
  closureRate: z.number(),
  groupedStats: z.any(),
});

// Validation schemas
const CreateTicketSchema = z.object({
  guildId: DiscordGuildIdSchema,
  panelId: z.number().positive().optional(),
  subject: z.string().min(1).max(100),
  categoryId: DiscordChannelIdSchema.optional(),
  openerId: DiscordGuildIdSchema,
  initialMessage: z.string().optional(),
  formResponses: z.record(z.string(), z.string()).optional(),
});

const UpdateTicketSchema = z.object({
  subject: z.string().min(1).max(100).optional(),
  status: TicketStatusSchema.optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  categoryId: DiscordChannelIdSchema.optional(),
  sentimentScore: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().optional().default(false),
});

// Helper functions
const parseTicketId = (id: string): number => {
  if (!id) throw ApiErrors.badRequest("Ticket ID is required");

  const decodedId = decodeURIComponent(id);
  const cleanId = decodedId.startsWith("#") ? decodedId.substring(1) : decodedId;
  const ticketId = parseInt(cleanId, 10);

  if (isNaN(ticketId)) throw ApiErrors.badRequest("Invalid ticket ID format");

  return ticketId;
};

const formatTicketForDashboard = async (
  ticket: any
): Promise<z.infer<typeof _TicketDashboardResponse>> => {
  // Calculate progress from sentiment score or status
  let progress = 0;
  if (ticket.sentimentScore !== null) {
    progress = Math.round(ticket.sentimentScore);
  } else {
    if (ticket.status === "closed") {
      progress = 100;
    } else {
      try {
        const currentClaim = await TicketLifecycle.getCurrentClaim(ticket.id);
        progress = currentClaim ? 75 : 25;
      } catch {
        progress = 25;
      }
    }
  }

  // Get message count for urgency
  let messageCount = 0;
  try {
    const messages = await Transcripts.getMessages(ticket.id);
    messageCount = messages.length;
  } catch {
    messageCount = 0;
  }

  let urgency = "Low";
  if (messageCount > 20) urgency = "High";
  else if (messageCount > 10) urgency = "Medium";

  // Calculate last message time
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

// Create ticket routes using method chaining
export const ticketRoutes = createRoute()
  // List tickets
  .get(
    "/",
    ...compositions.authenticated,
    zValidator(
      "query",
      z.object({
        guildId: DiscordGuildIdSchema,
        status: TicketStatusSchema.optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(50),
      })
    ),
    requirePermission(PermissionFlags.TICKET_VIEW_ALL),
    async (c) => {
      const { guildId, status, page, pageSize } = c.req.valid("query");

      const tickets = await Ticket.list({
        guildId,
        status,
        pagination: { page, pageSize },
      });

      const formattedTickets = await Promise.all(
        tickets.map((ticket) => formatTicketForDashboard(ticket))
      );

      return c.json(formattedTickets);
    }
  )

  // Get recent activity
  .get(
    "/recent-activity",
    ...compositions.authenticated,
    zValidator(
      "query",
      z.object({
        guildId: DiscordGuildIdSchema,
        limit: z.coerce.number().int().positive().max(50).default(10),
      })
    ),
    requirePermission(PermissionFlags.TICKET_VIEW_ALL),
    async (c) => {
      // Guild ID is available from query through context
      // TODO: Implement event listing in Event domain or Analytics
      // For now, return empty array to match current behavior
      const recentEvents: any[] = [];

      const formattedEvents = recentEvents.map((event: any, index: number) => ({
        id: event.id || index,
        event: event.action,
        timestamp: new Date(event.createdAt).toISOString(),
        ticketId: event.ticketId,
        performedBy: {
          id: event.actorId || "system",
          username: event.actor?.username || "System",
          avatarUrl: event.actor?.avatarUrl,
        },
        metadata: event.metadata,
      }));

      return c.json(formattedEvents);
    }
  )

  // Get ticket details
  .get(
    "/:id",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);

      try {
        const ticket = await Ticket.getById(ticketId);
        const formatted = await formatTicketForDashboard(ticket);
        return c.json(formatted);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Ticket");
        }
        throw error;
      }
    }
  )

  // Create ticket
  .post("/", ...compositions.authenticated, zValidator("json", CreateTicketSchema), async (c) => {
    const input = c.req.valid("json");

    try {
      // Use TicketLifecycle.create for ticket creation
      const { TicketLifecycle } = await import("@ticketsbot/core/domains");
      const ticket = await TicketLifecycle.create({
        guildId: input.guildId,
        channelId: "", // This would need to be generated by Discord bot
        openerId: input.openerId,
        panelId: input.panelId || null,
        subject: input.subject || null,
        categoryId: input.categoryId || null,
        metadata: {
          initialMessage: input.initialMessage,
          formResponses: input.formResponses,
        },
      });

      const formatted = await formatTicketForDashboard(ticket);
      return c.json(formatted, 201);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "validation_error") {
          throw ApiErrors.badRequest((error as any).message || "Validation error");
        }
        if (error.code === "permission_denied") {
          throw ApiErrors.forbidden((error as any).message || "Permission denied");
        }
      }
      throw error;
    }
  })

  // Update ticket
  .put(
    "/:id",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", UpdateTicketSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      const ticketId = parseTicketId(id);

      try {
        const ticket = await Ticket.update(ticketId, input);
        const formatted = await formatTicketForDashboard(ticket);
        return c.json(formatted);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Ticket");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden((error as any).message || "Permission denied");
          }
        }
        throw error;
      }
    }
  )

  // Close ticket
  .post(
    "/:id/close",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z
        .object({
          reason: z.string().optional(),
        })
        .optional()
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const ticketId = parseTicketId(id);
      const user = c.get("user");

      try {
        await TicketLifecycle.close({
          ticketId,
          closedById: user.discordUserId || user.id,
          reason: body?.reason,
          deleteChannel: false,
          notifyOpener: true,
        });
        const ticket = await Ticket.getById(ticketId);
        const formatted = await formatTicketForDashboard(ticket);
        return c.json(formatted);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Ticket");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden((error as any).message || "Permission denied");
          }
        }
        throw error;
      }
    }
  )

  // Claim ticket
  .post(
    "/:id/claim",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    requirePermission(PermissionFlags.TICKET_CLAIM),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);
      const user = c.get("user");

      try {
        await TicketLifecycle.claim({
          ticketId,
          claimerId: user.discordUserId || user.id,
          force: false,
        });
        const ticket = await Ticket.getById(ticketId);
        const formatted = await formatTicketForDashboard(ticket);
        return c.json(formatted);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Ticket");
          }
          if (error.code === "already_claimed") {
            throw ApiErrors.conflict((error as any).message || "Ticket already claimed");
          }
        }
        throw error;
      }
    }
  )

  // Unclaim ticket
  .post(
    "/:id/unclaim",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);
      const user = c.get("user");

      try {
        await TicketLifecycle.unclaim({
          ticketId,
          performedById: user.discordUserId || user.id,
        });
        const ticket = await Ticket.getById(ticketId);
        const formatted = await formatTicketForDashboard(ticket);
        return c.json(formatted);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Ticket");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden((error as any).message || "Permission denied");
          }
        }
        throw error;
      }
    }
  )

  // Get ticket activity
  .get(
    "/:id/activity",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("query", z.object({ guildId: z.string().optional() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);

      try {
        const [lifecycleHistory, transcriptHistory] = await Promise.all([
          TicketLifecycle.getHistory(ticketId),
          Transcripts.getHistory(ticketId),
        ]);

        const combinedActivity = [
          ...lifecycleHistory.map((entry: any) => ({
            id: entry.id,
            timestamp: entry.timestamp,
            action: entry.action,
            type: "lifecycle" as const,
            details: entry.details,
            performedBy: entry.performedBy,
          })),
          ...transcriptHistory.map((entry: any) => ({
            id: entry.id,
            timestamp: entry.timestamp,
            action: entry.action,
            type: "transcript" as const,
            details: entry.details,
            performedBy: entry.performedBy,
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const formattedActivity = combinedActivity.map((entry: any) => ({
          id: entry.id,
          timestamp: new Date(entry.timestamp).toISOString(),
          action: entry.action,
          type: entry.type,
          details: entry.details,
          performedBy: entry.performedBy
            ? {
                id: entry.performedBy.id.toString(),
                username: entry.performedBy.username || "Unknown User",
                global_name: entry.performedBy.username || "Unknown User",
              }
            : null,
        }));

        return c.json(formattedActivity satisfies z.infer<typeof _ActivityEntry>[]);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Ticket");
        }
        throw error;
      }
    }
  )

  // Get ticket messages
  .get(
    "/:id/messages",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("query", z.object({ guildId: z.string().optional() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);

      try {
        const messages = await Transcripts.getMessages(ticketId);

        const formattedMessages = await Promise.all(
          messages.map(async (message) => {
            let author = null;
            if (message.authorId) {
              try {
                const user = await User.getDiscordUser(message.authorId);
                if (user) {
                  author = {
                    id: user.id.toString(),
                    username: user.username || "Unknown User",
                    avatarUrl: user.avatarUrl,
                    metadata: user.metadata || null,
                  };
                }
              } catch {
                author = {
                  id: message.authorId,
                  username: "Unknown User",
                  avatarUrl: null,
                  metadata: null,
                };
              }
            }

            return {
              id: message.id,
              content: message.content || "",
              timestamp: new Date(message.createdAt).toISOString(),
              author,
              ticketId,
              isInternal: message.messageType === "internal",
            };
          })
        );

        return c.json(formattedMessages);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Ticket");
        }
        throw error;
      }
    }
  )

  // Send message to ticket
  .post(
    "/:id/messages",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", SendMessageSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { content, isInternal } = c.req.valid("json");
      const ticketId = parseTicketId(id);
      const user = c.get("user");

      try {
        const message = await Transcripts.storeMessage({
          ticketId,
          messageId: "", // This would be generated by Discord bot
          authorId: user.discordUserId || user.id,
          content,
          embeds: null,
          attachments: null,
          messageType: isInternal ? "internal" : "public",
          referenceId: null,
        });

        const formatted: z.infer<typeof _TicketMessage> = {
          id: message.id,
          content: message.content || "",
          timestamp: new Date(message.createdAt).toISOString(),
          author: {
            id: user.id,
            username: user.name || "Unknown User",
            avatarUrl: user.image || null,
          },
          ticketId,
          isInternal: message.messageType === "internal",
        };

        return c.json(formatted, 201);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Ticket");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden((error as any).message || "Permission denied");
          }
        }
        throw error;
      }
    }
  )

  // Get ticket statistics
  .get(
    "/statistics/:guildId",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    requirePermission(PermissionFlags.ANALYTICS_VIEW),
    async (c) => {
      const { guildId } = c.req.valid("param");

      const _stats = await Analytics.getTicketStatistics({
        guildId,
        includeDeleted: false,
      });

      return c.json({
        totalTickets: _stats.totalCreated,
        openTickets: _stats.totalOpen,
        closedTickets: _stats.totalClosed,
        avgResponseTime: _stats.avgResolutionTime,
        closureRate: _stats.closureRate,
        groupedStats: _stats.groupedStats,
      } satisfies z.infer<typeof _TicketStatistics>);
    }
  );
