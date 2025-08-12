import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, TicketStatusSchema } from "@ticketsbot/db";
import { PermissionFlags } from "@ticketsbot/auth";
import { createRoute } from "../../factory";
import { ApiErrors } from "../../utils/error-handler";
import { compositions, requirePermission } from "../../middleware/context";
import {
  CreateTicketSchema,
  UpdateTicketSchema,
  SendMessageSchema,
  formatTicketForDashboard,
  parseTicketId,
  type _TicketDashboardResponse,
  type _ActivityEntry,
  type _TicketMessage,
  type _TicketStatistics,
} from "./schemas";

export const ticketRoutes = createRoute()
  .get(
    "/",
    ...compositions.authenticated,
    zValidator(
      "query",
      z.object({
        guildId: z.string(),
        status: TicketStatusSchema.optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(50),
      })
    ),
    requirePermission(PermissionFlags.TICKET_VIEW_ALL),
    async (c) => {
      const { guildId, status, page, pageSize } = c.req.valid("query");

      const tickets = await db.ticket.list({
        guildId,
        status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      const formattedTickets = await Promise.all(
        tickets.map((ticket) => formatTicketForDashboard(ticket))
      );

      return c.json(formattedTickets);
    }
  )

  .get(
    "/recent-activity",
    ...compositions.authenticated,
    zValidator(
      "query",
      z.object({
        guildId: z.string(),
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

  .get(
    "/:id",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);

      try {
        const ticket = await db.ticket.getById(ticketId);
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

  .post("/", ...compositions.authenticated, zValidator("json", CreateTicketSchema), async (c) => {
    const input = c.req.valid("json");

    try {
      const ticket = await db.ticket.create({
        guildId: input.guildId,
        channelId: "",
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
        const ticket = await db.ticket.update(ticketId, input);
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
        await db.ticket.close({
          ticketId,
          closedById: user.discordUserId || user.id,
          reason: body?.reason,
          deleteChannel: false,
          notifyOpener: true,
        });
        const ticket = await db.ticket.getById(ticketId);
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
        await db.ticket.claim({
          ticketId,
          claimerId: user.discordUserId || user.id,
          force: false,
        });
        const ticket = await db.ticket.getById(ticketId);
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

  .post(
    "/:id/unclaim",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);
      const user = c.get("user");

      try {
        await db.ticket.unclaim({
          ticketId,
          performedById: user.discordUserId || user.id,
        });
        const ticket = await db.ticket.getById(ticketId);
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
          db.ticket.getLifecycleHistory(ticketId),
          db.transcript.getHistory(ticketId),
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

  .get(
    "/:id/messages",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("query", z.object({ guildId: z.string().optional() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const ticketId = parseTicketId(id);

      try {
        const messages = await db.transcript.getMessages(ticketId);

        const formattedMessages = await Promise.all(
          messages.map(async (message) => {
            let author = null;
            if (message.authorId) {
              try {
                const user = await db.discordUser.getDiscordUser(message.authorId);
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
        const message = await db.transcript.storeMessage({
          ticketId,
          messageId: "",
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

  .get(
    "/statistics/:guildId",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: z.string() })),
    requirePermission(PermissionFlags.ANALYTICS_VIEW),
    async (c) => {
      const { guildId } = c.req.valid("param");

      const _stats = await db.analytics.getTicketStatistics({
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
