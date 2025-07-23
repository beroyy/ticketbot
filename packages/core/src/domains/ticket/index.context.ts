import { prisma, TicketStatus, type Prisma } from "../../prisma/client";
import { Actor, afterTransaction } from "../../context";
import { PermissionFlags } from "../../schemas/permissions-constants";
import type { TicketQuery, UpdateTicketInput } from "./schemas";

// Export only core schemas
export {
  TicketCoreSchema,
  UpdateTicketSchema,
  TicketQuerySchema,
  FindByChannelSchema,
  type TicketCore,
  type UpdateTicketInput,
  type TicketQuery,
  type FindByChannelInput,
} from "./schemas";

/**
 * Core Ticket domain methods - slimmed down to essential operations
 * Lifecycle operations have been moved to TicketLifecycle domain
 * Message/content operations have been moved to Transcripts domain
 * Statistics operations have been moved to Analytics domain
 */
export namespace Ticket {
  /**
   * Get a ticket by ID
   * Requires appropriate view permissions
   */
  export const getById = async (ticketId: number): Promise<any> => {
    const guildId = Actor.guildId();
    const userId = Actor.userId();

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        guild: true,
        panel: true,
        opener: true,
      },
    });

    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    // Check permissions
    const isOwner = ticket.openerId === userId;
    if (!isOwner) {
      Actor.requirePermission(PermissionFlags.TICKET_VIEW_ALL);
    }

    return ticket;
  };

  /**
   * Get ticket by ID without permission checks
   * For internal use only
   */
  export const getByIdUnchecked = async (ticketId: number): Promise<any> => {
    return prisma.ticket.findUnique({
      where: { id: ticketId },
    });
  };

  /**
   * Find ticket by channel ID
   */
  export const findByChannelId = async (channelId: string): Promise<any> => {
    const guildId = Actor.guildId();

    return prisma.ticket.findFirst({
      where: {
        guildId,
        channelId,
        deletedAt: null,
      },
    });
  };

  /**
   * List tickets with filtering
   */
  export const list = async (query: TicketQuery): Promise<any[]> => {
    const { TicketQuerySchema } = await import("./schemas");
    const parsed = TicketQuerySchema.parse(query);
    const guildId = Actor.guildId();
    
    const where: Prisma.TicketWhereInput = {
      guildId: parsed.guildId || guildId,
      ...(parsed.status && { status: parsed.status }),
      ...(parsed.openerId && { openerId: parsed.openerId }),
      ...(parsed.panelId && { panelId: parsed.panelId }),
      ...(parsed.channelId && { channelId: parsed.channelId }),
      deletedAt: null,
    };

    const skip = parsed.pagination ? (parsed.pagination.page - 1) * parsed.pagination.pageSize : 0;
    const take = parsed.pagination?.pageSize || 50;
    
    return prisma.ticket.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  };

  /**
   * Get the count of open tickets for the current user
   * Requires actor context with guildId
   */
  export const getMyOpenCount = async (): Promise<number> => {
    const userId = Actor.userId();
    const guildId = Actor.guildId();

    return prisma.ticket.count({
      where: {
        guildId,
        openerId: userId,
        status: TicketStatus.OPEN,
        deletedAt: null,
      },
    });
  };

  /**
   * Get the count of open tickets for a specific user
   * Requires TICKET_VIEW_ALL permission to view other users' tickets
   */
  export const getUserOpenCount = async (discordId: string): Promise<number> => {
    const actor = Actor.use();
    const guildId = Actor.guildId();

    // Check if viewing own tickets
    if (actor.type !== "system" && Actor.userId() !== discordId) {
      Actor.requirePermission(PermissionFlags.TICKET_VIEW_ALL);
    }

    return prisma.ticket.count({
      where: {
        guildId,
        openerId: discordId,
        status: TicketStatus.OPEN,
        deletedAt: null,
      },
    });
  };

  /**
   * Update a ticket's channel ID after Discord channel creation
   * Used internally after ticket creation
   */
  export const updateChannelId = async (ticketId: number, channelId: string): Promise<any> => {
    const guildId = Actor.guildId();

    return prisma.ticket.update({
      where: {
        id: ticketId,
        guildId, // Ensure ticket belongs to current guild
      },
      data: {
        channelId,
      },
    });
  };

  /**
   * Update basic ticket properties
   */
  export const update = async (ticketId: number, data: UpdateTicketInput): Promise<any> => {
    const { UpdateTicketSchema } = await import("./schemas");
    const parsed = UpdateTicketSchema.parse(data);
    const guildId = Actor.guildId();

    return prisma.ticket.update({
      where: {
        id: ticketId,
        guildId,
      },
      data: {
        ...(parsed.status && { status: parsed.status }),
        ...(parsed.subject !== undefined && { subject: parsed.subject }),
        ...(parsed.categoryId !== undefined && { categoryId: parsed.categoryId }),
        updatedAt: new Date(),
      },
    });
  };

  /**
   * Soft delete a ticket
   */
  export const softDelete = async (ticketId: number): Promise<any> => {
    const guildId = Actor.guildId();
    Actor.requirePermission(PermissionFlags.TICKET_CLOSE_ANY);

    return prisma.ticket.update({
      where: {
        id: ticketId,
        guildId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  };

  /**
   * Check if a channel is a ticket channel
   */
  export const isTicketChannel = async (channelId: string): Promise<boolean> => {
    const guildId = Actor.guildId();
    
    const count = await prisma.ticket.count({
      where: {
        guildId,
        channelId,
        deletedAt: null,
      },
    });

    return count > 0;
  };

  /**
   * Get full ticket details with all related data
   * This is a delegation method that combines data from multiple domains
   */
  export const getFullDetails = async (ticketId: number): Promise<any> => {
    // Import subdomains dynamically to avoid circular dependencies
    const { TicketLifecycle } = await import("../ticket-lifecycle");
    const { Transcripts } = await import("../transcripts");

    const core = await getById(ticketId);
    
    // Get lifecycle history
    const lifecycleHistory = await TicketLifecycle.getHistory(ticketId);
    
    // Get transcript data
    const transcript = await Transcripts.getTranscript(ticketId);
    const messages = await Transcripts.getMessages(ticketId);

    return {
      ...core,
      lifecycle: lifecycleHistory,
      transcript,
      messages,
    };
  };

  /**
   * List tickets for API with full details
   */
  export const listForApi = async (query: TicketQuery): Promise<any[]> => {
    const tickets = await list(query);
    
    // For API responses, we might want to include some basic stats
    // but not full messages to keep response size manageable
    return tickets.map(ticket => ({
      ...ticket,
      messageCount: 0, // This would come from Transcripts domain
      lastActivity: ticket.updatedAt,
    }));
  };

  /**
   * Add a participant to a ticket
   */
  export const addParticipant = async (ticketId: number, userId: string, role: "participant" | "observer" = "participant"): Promise<void> => {
    const guildId = Actor.guildId();
    
    // Verify ticket belongs to guild
    const ticket = await getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    // Add participant, ignore if already exists
    await prisma.ticketParticipant.upsert({
      where: {
        ticketId_userId: {
          ticketId,
          userId,
        },
      },
      update: {
        role,
      },
      create: {
        ticketId,
        userId,
        role,
      },
    });

    // Log event
    afterTransaction(async () => {
      const { Event } = await import("../event");
      await Event.create({
        guildId,
        actorId: Actor.userId(),
        category: "TICKET",
        action: "ticket.participant_added",
        targetType: "TICKET",
        targetId: ticketId.toString(),
        ticketId,
        metadata: {
          participantId: userId,
          role,
        },
      });
    });
  };

  /**
   * Remove a participant from a ticket
   */
  export const removeParticipant = async (ticketId: number, userId: string): Promise<void> => {
    const guildId = Actor.guildId();
    
    // Verify ticket belongs to guild
    const ticket = await getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    // Don't allow removing the ticket opener
    if (ticket.openerId === userId) {
      throw new Error("Cannot remove ticket opener as participant");
    }

    // Remove participant
    await prisma.ticketParticipant.delete({
      where: {
        ticketId_userId: {
          ticketId,
          userId,
        },
      },
    });

    // Log event
    afterTransaction(async () => {
      const { Event } = await import("../event");
      await Event.create({
        guildId,
        actorId: Actor.userId(),
        category: "TICKET",
        action: "ticket.participant_removed",
        targetType: "TICKET",
        targetId: ticketId.toString(),
        ticketId,
        metadata: {
          participantId: userId,
        },
      });
    });
  };

  /**
   * Get all participants for a ticket
   */
  export const getParticipants = async (ticketId: number): Promise<any[]> => {
    const guildId = Actor.guildId();
    
    // Verify ticket belongs to guild
    const ticket = await getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    return prisma.ticketParticipant.findMany({
      where: { ticketId },
      include: {
        discordUser: true,
      },
      orderBy: { role: "asc" },
    });
  };

  /**
   * Check if a user is a participant in a ticket
   */
  export const isParticipant = async (ticketId: number, userId: string): Promise<boolean> => {
    const guildId = Actor.guildId();
    
    // Verify ticket belongs to guild
    const ticket = await getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    // Opener is always a participant
    if (ticket.openerId === userId) {
      return true;
    }

    const participant = await prisma.ticketParticipant.findUnique({
      where: {
        ticketId_userId: {
          ticketId,
          userId,
        },
      },
    });

    return participant !== null;
  };
}