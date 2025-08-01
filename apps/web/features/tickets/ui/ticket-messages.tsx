import type { Ticket } from "@/features/tickets/types";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { MessageItem } from "./message-item";
import {
  formatMessages,
  createFallbackMessage,
  type FormattedMessage,
} from "@/features/tickets/utils/message-formatters";

dayjs.extend(customParseFormat);

interface TicketMessagesProps {
  messages: any[] | undefined;
  ticket: Ticket;
  isLoading: boolean;
  error: Error | null;
}

export function TicketMessages({ messages, ticket, isLoading, error }: TicketMessagesProps) {

  // Parse ticket creation date with dayjs
  let ticketDate = dayjs(
    ticket.createdAt,
    ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "D MMM YY", "DD MMM YY"],
    true
  );

  if (!ticketDate.isValid()) {
    ticketDate = dayjs();
  }


  // Format real messages for display
  const formattedMessages: FormattedMessage[] = formatMessages(messages || [], ticket);

  // If no messages loaded yet, show fallback
  const displayMessages: FormattedMessage[] =
    formattedMessages.length > 0
      ? formattedMessages
      : [createFallbackMessage(ticket, ticketDate)];

  return (
    <div className="flex-1 space-y-4 overflow-auto px-6 pb-4">
      <div className="mb-4 text-center text-sm text-gray-500">{ticketDate.format("M/D/YYYY")}</div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-8 text-center">
          <p className="text-sm text-red-500">Failed to load messages</p>
        </div>
      )}

      {/* Messages */}
      {!isLoading &&
        !error &&
        displayMessages.map((message) => (
          <MessageItem key={message.id} message={message} ticket={ticket} />
        ))}

      {/* Empty state for when messages are loaded but none exist */}
      {!isLoading && !error && formattedMessages.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No messages in this ticket yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Messages will appear here as the conversation develops.
          </p>
        </div>
      )}
    </div>
  );
}
