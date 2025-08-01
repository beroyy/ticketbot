import dayjs from "dayjs";
import type { Ticket } from "@/features/tickets/types";

export interface FormattedMessage {
  id: number | string;
  messageId?: string;
  author: string;
  authorId?: string;
  content: string;
  embeds?: Record<string, unknown>[] | null;
  attachments?: Record<string, unknown>[] | null;
  timestamp: string;
  createdAt?: string;
  editedAt?: string | null;
  messageType?: string;
  isStaff?: boolean;
  isBot?: boolean;
  avatarUrl?: string | null;
  metadata?: unknown;
}

export function getMessageType(message: any, ticket: Ticket): string {
  if (message.messageType === "bot_message" || message.messageType === "bot_reply") {
    return "bot";
  }

  if (ticket.openerDiscordId && message.author?.id !== ticket.openerDiscordId) {
    return "staff";
  }

  return "user";
}

export function getAuthorDisplayName(message: any): string {
  const authorMetadata = message.author?.metadata as { displayName?: string } | null;
  if (authorMetadata?.displayName) {
    return authorMetadata.displayName;
  }
  return message.author?.username || "Unknown User";
}

export function formatMessages(messages: any[], ticket: Ticket): FormattedMessage[] {
  if (!messages) return [];

  return messages.map((message: any) => ({
    id: message.id,
    messageId: message.messageId,
    author: getAuthorDisplayName(message),
    authorId: message.author?.id,
    content: message.content,
    embeds: message.embeds,
    attachments: message.attachments,
    timestamp: dayjs(message.createdAt).format("h:mm A"),
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    messageType: getMessageType(message, ticket),
    isStaff: getMessageType(message, ticket) === "staff",
    isBot: getMessageType(message, ticket) === "bot",
    avatarUrl: message.author?.avatarUrl,
    metadata: message.author?.metadata,
  }));
}

export function createFallbackMessage(ticket: Ticket, ticketDate: dayjs.Dayjs): FormattedMessage {
  return {
    id: 0,
    author:
      (ticket.openerMetadata as { displayName?: string } | null)?.displayName ||
      ticket.opener ||
      "User",
    content: ticket.subject || `New ${ticket.type} ticket created`,
    timestamp: ticketDate.format("h:mm A"),
    isStaff: false,
    avatarUrl: ticket.openerImage || null,
    embeds: null,
    attachments: null,
    editedAt: null,
  };
}
