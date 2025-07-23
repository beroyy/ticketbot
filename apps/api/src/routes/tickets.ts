import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Ticket, TicketLifecycle, Transcripts, Analytics } from "@ticketsbot/core/domains";
import { DiscordGuildIdSchema, TicketStatusSchema, PositiveIntSchema } from "@ticketsbot/core";
import { requireAuth, requirePermission } from "../middleware/context";
import { PermissionFlags } from "@ticketsbot/core";
import { GuildIdParamSchema, TicketQuerySchema } from "../utils/validation-schemas";
import type { AuthSession } from "@ticketsbot/core/auth";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

export const tickets: Hono<{ Variables: Variables }> = new Hono<{ Variables: Variables }>();

// Helper function to parse ticket ID from URL parameter
const parseTicketId = (id: string): number => {
  if (!id) {
    throw new Error("Ticket ID is required");
  }

  // Decode the URL parameter first
  const decodedId = decodeURIComponent(id);

  // Remove the # prefix if it exists
  const cleanId = decodedId.startsWith("#") ? decodedId.substring(1) : decodedId;

  const ticketId = parseInt(cleanId, 10);

  if (isNaN(ticketId)) {
    throw new Error("Invalid ticket ID format");
  }

  return ticketId;
};

// Helper function to format tickets for dashboard display
const formatTicketForDashboard = async (ticket: any) => {
  // Calculate progress from sentiment_score (0 to 100) - use directly as percentage
  // If no sentiment_score, fall back to status-based calculation
  let progress = 0;
  if (ticket.sentimentScore !== null) {
    // sentimentScore is already 0-100, use directly as progress percentage
    progress = Math.round(ticket.sentimentScore);
  } else {
    // Fallback to status-based calculation if no sentiment score
    if (ticket.status === "closed") {
      progress = 100;
    } else {
      // Check if ticket is claimed from lifecycle events
      try {
        const currentClaim = await TicketLifecycle.getCurrentClaim(ticket.id);
        if (currentClaim) {
          progress = 75; // Claimed tickets are 75% complete
        } else {
          progress = 25; // Unclaimed tickets are 25% complete
        }
      } catch {
        progress = 25; // Default to unclaimed
      }
    }
  }

  // Determine urgency/priority - get message count from transcripts
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

  // Calculate last message time (simplified for now)
  const daysSinceCreated = Math.floor(
    (Date.now() - ticket.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let lastMessage = "Never";
  if (daysSinceCreated === 0) lastMessage = "Today";
  else if (daysSinceCreated === 1) lastMessage = "1 day ago";
  else if (daysSinceCreated < 30) lastMessage = `${daysSinceCreated.toString()} days ago`;
  else lastMessage = "Last month";

  return {
    id: `#${ticket.id.toString()}`,
    type: ticket.panel?.title || "General Support",
    status: ticket.status,
    priority: urgency.toLowerCase(),
    assignee: null, // Will be populated from lifecycle events
    assigneeAvatar: ticket.claimedBy?.username
      ? ticket.claimedBy.username[0]?.toUpperCase() || null
      : null,
    assigneeImage: ticket.claimedBy?.avatarUrl || null,
    urgency: `${Math.min(10, Math.max(1, messageCount)).toString()}/10`,
    awaitingResponse: messageCount > 0 ? "Yes" : "No",
    lastMessage,
    createdAt: ticket.createdAt.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    }),
    progress,
    subject: ticket.subject,
    opener: ticket.opener.username,
    openerAvatar: ticket.opener.username ? ticket.opener.username[0]?.toUpperCase() || null : null,
    openerImage: ticket.opener.avatarUrl || null,
    openerDiscordId: ticket.openerId.toString(),
    openerMetadata: ticket.opener.metadata || null,
    // AI-related fields
    sentimentScore: ticket.sentimentScore,
    summary: ticket.summary,
    embedding: ticket.embedding,
  };
};

// GET /tickets - List tickets for a guild
tickets.get(
  "/",
  requireAuth,
  requirePermission(PermissionFlags.TICKET_VIEW_ALL),
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
      status: TicketStatusSchema.optional(),
    })
  ),
  async (c) => {
    try {
      const { status, guildId } = c.req.valid("query");

      // Use core ticket list method
      const tickets = await Ticket.list({
        guildId,
        status: status,
        pagination: { page: 1, pageSize: 500 },
      });

      // Format tickets for the dashboard with async mapping
      const formattedTickets = await Promise.all(
        tickets.map(ticket => formatTicketForDashboard(ticket))
      );

      return c.json(formattedTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      return c.json({ error: "Failed to fetch tickets" }, 500);
    }
  }
);

// GET /tickets/:id/activity - Get activity log for a specific ticket
tickets.get(
  "/:id/activity",
  requireAuth,
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const { id } = c.req.valid("param");

  try {
    const ticketId = parseTicketId(id);
    
    // Get activity from both lifecycle and transcript history
    const [lifecycleHistory, transcriptHistory] = await Promise.all([
      TicketLifecycle.getHistory(ticketId),
      Transcripts.getHistory(ticketId),
    ]);

    // Combine and format the activity
    const combinedActivity = [
      ...lifecycleHistory.map((entry: any) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        type: 'lifecycle',
        details: entry.details,
        performedBy: entry.performedBy,
      })),
      ...transcriptHistory.map((entry: any) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        type: 'transcript',
        details: entry.details,
        performedBy: entry.performedBy,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Format the response
    const formattedActivity = combinedActivity.map((entry: any) => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp).toISOString(),
      action: entry.action,
      type: entry.type,
      details: entry.details,
      performedBy: entry.performedBy ? {
        id: entry.performedBy.id.toString(),
        username: entry.performedBy.username || "Unknown User",
        global_name: entry.performedBy.username || "Unknown User",
      } : null,
    }));

    return c.json(formattedActivity);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Ticket not found") {
        return c.json({ message: "Ticket not found" }, 404);
      }
      if (
        error.message === "Invalid ticket ID format" ||
        error.message === "Ticket ID is required"
      ) {
        return c.json({ message: error.message }, 400);
      }
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "permission_denied" &&
      "message" in error
    ) {
      return c.json({ message: String(error.message) }, 403);
    }
    console.error("Error fetching ticket activity:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// GET /tickets/:id/messages - Get messages for a specific ticket
tickets.get(
  "/:id/messages",
  requireAuth,
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const { id } = c.req.valid("param");

  try {
    const ticketId = parseTicketId(id);
    
    // Get messages from transcripts domain
    const messages = await Transcripts.getMessages(ticketId);

    // Format messages for response
    const formattedMessages = await Promise.all(
      messages.map(async (message) => {
        // Fetch author details if needed
        let author = null;
        if (message.authorId) {
          try {
            const { User } = await import("@ticketsbot/core/domains");
            const user = await User.getDiscordUser(message.authorId);
            if (user) {
              author = {
                id: user.id.toString(),
                username: user.username || "Unknown User",
                avatarUrl: user.avatarUrl,
              };
            }
          } catch {
            author = {
              id: message.authorId,
              username: "Unknown User",
              avatarUrl: null,
            };
          }
        }

        return {
          id: message.id,
          content: message.content,
          timestamp: new Date(message.createdAt).toISOString(),
          author,
          ticketId,
          isInternal: message.messageType === 'internal',
        };
      })
    );

    return c.json(formattedMessages);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Ticket not found") {
        return c.json({ error: "Ticket not found" }, 404);
      }
      if (
        error.message === "Invalid ticket ID format" ||
        error.message === "Ticket ID is required"
      ) {
        return c.json({ error: error.message }, 400);
      }
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "permission_denied" &&
      "message" in error
    ) {
      return c.json({ error: String(error.message) }, 403);
    }
    console.error("Error fetching ticket messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

// GET /tickets/:guildId/statistics - Get ticket statistics for a guild
tickets.get(
  "/:guildId/statistics",
  requireAuth,
  requirePermission(PermissionFlags.ANALYTICS_VIEW),
  zValidator("param", GuildIdParamSchema),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");
      
      // Get statistics from analytics domain
      const stats = await Analytics.getTicketStatistics({
        guildId,
        includeDeleted: false,
      });

      return c.json({
        totalTickets: stats.totalCreated,
        openTickets: stats.totalOpen,
        closedTickets: stats.totalClosed,
        avgResponseTime: stats.avgResolutionTime,
        closureRate: stats.closureRate,
        groupedStats: stats.groupedStats,
      });
    } catch (error) {
      console.error("Error fetching ticket statistics:", error);
      return c.json({ error: "Failed to fetch statistics" }, 500);
    }
  }
);

// GET /tickets/recent-activity - Get recent activity across guilds
tickets.get(
  "/recent-activity",
  requireAuth,
  requirePermission(PermissionFlags.TICKET_VIEW_ALL),
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
      limit: z.coerce
        .number()
        .int()
        .positive()
        .max(50)
        .optional()
        .default(10),
    })
  ),
  async (c) => {
    try {
      const { guildId, limit } = c.req.valid("query");

      // Set guild context
      c.set("guildId", guildId);

      // Check permissions - user needs to be able to view tickets
      const actor = c.get("user");
      if (!actor.discordUserId) {
        return c.json({ error: "Discord account not linked" }, 403);
      }

      // TODO: Implement event listing in Event domain or Analytics
      // For now, return empty array
      const recentEvents: any[] = [];

      // Format activity to match frontend expectations
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
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      return c.json({ error: "Failed to fetch recent activity" }, 500);
    }
  }
);
