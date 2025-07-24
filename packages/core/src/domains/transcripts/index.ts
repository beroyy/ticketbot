import { prisma } from "../../prisma/client";
import { Actor } from "../../context";
import { Ticket } from "../ticket";

// Import types
import type {
  CreateTicketMessageInput,
  UpdateTicketMessageInput,
  TicketMessage,
  StoreFieldResponseInput,
  SubmitFeedbackInput,
  ExportTranscriptInput,
  MessageQuery,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TranscriptWithMessages,
} from "./schemas";

// Export schemas
export {
  TranscriptSchema,
  CreateTicketMessageSchema,
  UpdateTicketMessageSchema,
  DeleteTicketMessageSchema,
  TicketMessageSchema,
  StoreFieldResponseSchema,
  SubmitFeedbackSchema,
  ExportTranscriptSchema,
  MessageQuerySchema,
  TranscriptWithMessagesSchema,
  type Transcript,
  type CreateTicketMessageInput,
  type UpdateTicketMessageInput,
  type DeleteTicketMessageInput,
  type TicketMessage,
  type StoreFieldResponseInput,
  type SubmitFeedbackInput,
  type ExportTranscriptInput,
  type MessageQuery,
  type TranscriptWithMessages,
} from "./schemas";

/**
 * Transcripts domain - handles ticket messages, history, and transcript generation
 */
export namespace Transcripts {
  /**
   * Get or create transcript for a ticket
   */
  export const getTranscript = async (ticketId: number): Promise<any> => {
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    let transcript = await prisma.transcript.findUnique({
      where: { ticketId },
    });

    // Create transcript if it doesn't exist (for legacy tickets)
    if (!transcript) {
      transcript = await prisma.transcript.create({
        data: { ticketId },
      });
    }

    return transcript;
  };

  /**
   * Store a message in the transcript
   */
  export const storeMessage = async (data: CreateTicketMessageInput): Promise<any> => {
    const { CreateTicketMessageSchema } = await import("./schemas");
    const parsed = CreateTicketMessageSchema.parse(data);
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(parsed.ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    // Get or create transcript
    const transcript = await getTranscript(parsed.ticketId);

    // Create message
    return prisma.ticketMessage.create({
      data: {
        transcriptId: transcript.id,
        messageId: parsed.messageId,
        authorId: parsed.authorId,
        content: parsed.content,
        embeds: parsed.embeds,
        attachments: parsed.attachments,
        messageType: parsed.messageType,
        referenceId: parsed.referenceId,
      },
    });
  };

  /**
   * Update a message in the transcript
   */
  export const updateMessage = async (
    messageId: string,
    data: UpdateTicketMessageInput
  ): Promise<any> => {
    const { UpdateTicketMessageSchema } = await import("./schemas");
    const parsed = UpdateTicketMessageSchema.parse(data);

    // Find message and verify access
    const message = await prisma.ticketMessage.findUnique({
      where: { messageId },
      include: {
        transcript: {
          include: {
            ticket: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    const guildId = Actor.guildId();
    if (message.transcript.ticket.guildId !== guildId) {
      throw new Error("Access denied");
    }

    // Update message
    return prisma.ticketMessage.update({
      where: { messageId },
      data: {
        content: parsed.content,
        editedAt: parsed.editedAt || new Date(),
      },
    });
  };

  /**
   * Delete a message from the transcript
   */
  export const deleteMessage = async (messageId: string): Promise<void> => {
    // Find message and verify access
    const message = await prisma.ticketMessage.findUnique({
      where: { messageId },
      include: {
        transcript: {
          include: {
            ticket: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    const guildId = Actor.guildId();
    if (message.transcript.ticket.guildId !== guildId) {
      throw new Error("Access denied");
    }

    // Soft delete
    await prisma.ticketMessage.update({
      where: { messageId },
      data: {
        deletedAt: new Date(),
      },
    });
  };

  /**
   * Get messages for a ticket
   */
  export const getMessages = async (
    ticketId: number,
    query?: MessageQuery
  ): Promise<TicketMessage[]> => {
    const { MessageQuerySchema } = await import("./schemas");
    const parsedQuery = query ? MessageQuerySchema.parse(query) : undefined;
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const transcript = await getTranscript(ticketId);

    return prisma.ticketMessage.findMany({
      where: {
        transcriptId: transcript.id,
        ...(parsedQuery?.authorId && { authorId: parsedQuery.authorId }),
        ...(parsedQuery?.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "asc" },
      skip: parsedQuery?.pagination
        ? (parsedQuery.pagination.page - 1) * parsedQuery.pagination.pageSize
        : 0,
      take: parsedQuery?.pagination?.pageSize || 100,
    });
  };

  /**
   * Store field responses for a ticket
   */
  export const storeFieldResponse = async (data: StoreFieldResponseInput): Promise<any> => {
    const { StoreFieldResponseSchema } = await import("./schemas");
    const parsed = StoreFieldResponseSchema.parse(data);
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(parsed.ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const transcript = await getTranscript(parsed.ticketId);

    return prisma.ticketFieldResponse.create({
      data: {
        transcriptId: transcript.id,
        fieldId: parsed.fieldId,
        value: parsed.value,
      },
    });
  };

  /**
   * Submit feedback for a ticket
   */
  export const submitFeedback = async (data: SubmitFeedbackInput): Promise<any> => {
    const { SubmitFeedbackSchema } = await import("./schemas");
    const parsed = SubmitFeedbackSchema.parse(data);
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild and user is the opener
    const ticket = await Ticket.getByIdUnchecked(parsed.ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const userId = Actor.userId();
    if (ticket.openerId !== userId && ticket.openerId !== parsed.submittedById) {
      throw new Error("Only the ticket opener can submit feedback");
    }

    const transcript = await getTranscript(parsed.ticketId);

    // Check if feedback already exists
    const existingFeedback = await prisma.ticketFeedback.findUnique({
      where: { transcriptId: transcript.id },
    });

    if (existingFeedback) {
      throw new Error("Feedback already submitted");
    }

    return prisma.ticketFeedback.create({
      data: {
        transcriptId: transcript.id,
        submittedById: parsed.submittedById,
        rating: parsed.rating,
        comment: parsed.comment,
      },
    });
  };

  /**
   * Get ticket history entries
   */
  export const getHistory = async (ticketId: number): Promise<any[]> => {
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const transcript = await getTranscript(ticketId);

    return prisma.ticketHistory.findMany({
      where: { transcriptId: transcript.id },
      orderBy: { timestamp: "desc" },
      include: {
        performedBy: true,
      },
    });
  };

  /**
   * Add history entry
   */
  export const addHistoryEntry = async (
    ticketId: number,
    action: string,
    performedById: string,
    details?: string
  ): Promise<any> => {
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const transcript = await getTranscript(ticketId);

    return prisma.ticketHistory.create({
      data: {
        transcriptId: transcript.id,
        action,
        performedById,
        details,
      },
    });
  };

  /**
   * Export transcript in various formats
   */
  export const exportTranscript = async (data: ExportTranscriptInput): Promise<string> => {
    const { ExportTranscriptSchema } = await import("./schemas");
    const parsed = ExportTranscriptSchema.parse(data);
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(parsed.ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    // Get all transcript data
    const transcript = await getTranscript(parsed.ticketId);
    const messages = await getMessages(parsed.ticketId);
    const history = await getHistory(parsed.ticketId);

    // Format based on requested type
    switch (parsed.format) {
      case "json":
        return JSON.stringify(
          {
            ticket,
            transcript,
            messages,
            history,
          },
          null,
          2
        );

      case "txt":
        return formatAsText(ticket, messages, history);

      case "html":
        return formatAsHtml(ticket, messages, history);

      case "pdf":
        // PDF generation would require additional dependencies
        throw new Error("PDF export not yet implemented");

      default:
        throw new Error(`Unknown export format: ${parsed.format}`);
    }
  };

  /**
   * Get full transcript with all related data
   */
  export const getFullTranscript = async (ticketId: number): Promise<any> => {
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const transcript = await getTranscript(ticketId);
    const messages = await getMessages(ticketId);

    const feedback = await prisma.ticketFeedback.findUnique({
      where: { transcriptId: transcript.id },
    });

    return {
      transcript,
      messages,
      feedback,
    };
  };

  /**
   * Update transcript summary and analysis
   */
  export const updateSummary = async (
    ticketId: number,
    summary: string,
    sentimentScore?: number,
    embedding?: string
  ): Promise<any> => {
    const guildId = Actor.guildId();

    // Verify ticket belongs to guild
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    if (!ticket || ticket.guildId !== guildId) {
      throw new Error("Ticket not found");
    }

    const transcript = await getTranscript(ticketId);

    return prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        summary,
        sentimentScore,
        embedding,
        updatedAt: new Date(),
      },
    });
  };
}

// Helper functions for transcript formatting
function formatAsText(ticket: any, messages: any[], history: any[]): string {
  let output = `Ticket #${ticket.number}\n`;
  output += `Subject: ${ticket.subject || "N/A"}\n`;
  output += `Opened: ${ticket.createdAt}\n`;
  output += `Status: ${ticket.status}\n`;
  output += "\n--- Messages ---\n\n";

  for (const msg of messages) {
    output += `[${msg.createdAt}] ${msg.authorId}: ${msg.content}\n`;
  }

  output += "\n--- History ---\n\n";
  for (const event of history) {
    output += `[${event.timestamp}] ${event.action} by ${event.performedById}\n`;
    if (event.details) {
      output += `  Details: ${event.details}\n`;
    }
  }

  return output;
}

function formatAsHtml(ticket: any, messages: any[], history: any[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Ticket #${ticket.number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .message { margin: 10px 0; padding: 10px; background: #f0f0f0; }
    .history { margin: 5px 0; color: #666; }
  </style>
</head>
<body>
  <h1>Ticket #${ticket.number}</h1>
  <p><strong>Subject:</strong> ${ticket.subject || "N/A"}</p>
  <p><strong>Status:</strong> ${ticket.status}</p>
  
  <h2>Messages</h2>
  ${messages
    .map(
      (msg) => `
    <div class="message">
      <strong>${msg.authorId}</strong> - ${msg.createdAt}<br>
      ${msg.content}
    </div>
  `
    )
    .join("")}
  
  <h2>History</h2>
  ${history
    .map(
      (event) => `
    <div class="history">
      ${event.timestamp} - ${event.action} by ${event.performedById}
      ${event.details ? `<br>Details: ${event.details}` : ""}
    </div>
  `
    )
    .join("")}
</body>
</html>
  `;
}
