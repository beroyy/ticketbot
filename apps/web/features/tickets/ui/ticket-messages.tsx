import Image from "next/image";
import type { TicketMessage, Ticket } from "@/features/tickets/types";
import dayjs from "dayjs";

interface FormattedMessage {
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

interface TicketMessagesProps {
  messages: TicketMessage[] | undefined;
  ticket: Ticket;
  isLoading: boolean;
  error: Error | null;
}

export function TicketMessages({ messages, ticket, isLoading, error }: TicketMessagesProps) {
  // Helper function to determine message type
  const getMessageType = (message: TicketMessage) => {
    if (message.messageType === "bot_message" || message.messageType === "bot_reply") {
      return "bot";
    }

    if (ticket.openerDiscordId && message.author.id !== ticket.openerDiscordId) {
      return "staff";
    }

    return "user";
  };

  // Helper function to get display name for message author
  const getAuthorDisplayName = (message: TicketMessage): string => {
    const authorMetadata = message.author.metadata as { displayName?: string };
    if (authorMetadata.displayName) {
      return authorMetadata.displayName;
    }
    return message.author.username;
  };

  // Parse ticket creation date with dayjs
  let ticketDate = dayjs(
    ticket.createdAt,
    ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "D MMM YY", "DD MMM YY"],
    true
  );

  if (!ticketDate.isValid()) {
    ticketDate = dayjs();
  }

  // Helper function to check if content contains a GIF that we're rendering
  const containsRenderedGif = (content: string): boolean => {
    return content.includes("tenor.com") || !!content.match(/\.gif(\?|$)/i);
  };

  // Helper function to render content with bold mentions and GIFs as JSX
  const renderContentWithMentions = (content: string): React.ReactNode => {
    if (!content) return content;

    // First split by user mentions
    const mentionParts = content.split(/(<@\d+>)/g);

    return mentionParts.map((mentionPart, mentionIndex) => {
      // Handle user mentions
      if (mentionPart.match(/^<@\d+>$/)) {
        const openerMetadata = ticket.openerMetadata as { displayName?: string };
        const displayName = openerMetadata.displayName || ticket.opener || "User";
        return (
          <strong key={mentionIndex} className="text-gray-700">
            @{displayName}
          </strong>
        );
      }

      // Split by URLs to handle GIF links
      const urlParts = mentionPart.split(/(https?:\/\/[^\s]+)/g);

      return urlParts.map((urlPart, urlIndex) => {
        // Check if this is a URL
        if (urlPart.match(/^https?:\/\//)) {
          // Check if it's a GIF link (Tenor, Giphy, or direct GIF URLs)
          if (
            urlPart.includes("tenor.com") ||
            urlPart.includes("giphy.com") ||
            urlPart.match(/\.gif(\?|$)/i)
          ) {
            // For Tenor links, use iframe embed
            if (urlPart.includes("tenor.com")) {
              const extractTenorId = (tenorUrl: string): string | null => {
                const match = tenorUrl.match(/gif-(\d+)$/);
                return match ? (match[1] ?? null) : null;
              };

              const tenorId = extractTenorId(urlPart);
              if (tenorId) {
                return (
                  <div key={`${String(mentionIndex)}-${String(urlIndex)}`} className="mt-2">
                    <iframe
                      src={`https://tenor.com/embed/${tenorId}`}
                      width="300"
                      height="300"
                      style={{ border: "none" }}
                      allowFullScreen
                      className="rounded"
                    />
                  </div>
                );
              }

              // Fallback to link if ID extraction fails
              return (
                <a
                  key={`${String(mentionIndex)}-${String(urlIndex)}`}
                  href={urlPart}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  🎬 Tenor GIF
                </a>
              );
            }

            // For direct GIF URLs
            if (urlPart.match(/\.gif(\?|$)/i)) {
              return (
                <div key={`${String(mentionIndex)}-${String(urlIndex)}`} className="mt-2">
                  <Image
                    src={urlPart}
                    alt="GIF"
                    className="max-w-sm rounded"
                    width={200}
                    height={200}
                  />
                </div>
              );
            }
          }

          // Regular link
          return (
            <a
              key={`${String(mentionIndex)}-${String(urlIndex)}`}
              href={urlPart}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {urlPart}
            </a>
          );
        }

        // Regular text
        return urlPart;
      });
    });
  };

  // Format real messages for display
  const formattedMessages: FormattedMessage[] = messages
    ? messages.map((message: TicketMessage) => ({
        id: message.id,
        messageId: message.messageId,
        author: getAuthorDisplayName(message),
        authorId: message.author.id,
        content: message.content,
        embeds: message.embeds,
        attachments: message.attachments,
        timestamp: dayjs(message.createdAt).format("h:mm A"),
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        messageType: getMessageType(message),
        isStaff: getMessageType(message) === "staff",
        isBot: getMessageType(message) === "bot",
        avatarUrl: message.author.avatarUrl,
        metadata: message.author.metadata,
      }))
    : [];

  // If no messages loaded yet, show fallback
  const displayMessages: FormattedMessage[] =
    formattedMessages.length > 0
      ? formattedMessages
      : [
          {
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
          },
        ];

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
          <div key={message.id} className="flex items-start space-x-3">
            <div className="h-8 w-8 overflow-hidden rounded-full">
              {message.avatarUrl ? (
                <Image
                  src={message.avatarUrl}
                  alt={message.author}
                  className="size-full object-cover"
                  width={32}
                  height={32}
                />
              ) : !message.isStaff && (ticket.openerImage || ticket.openerAvatar) ? (
                <Image
                  src={ticket.openerImage || ticket.openerAvatar || ""}
                  alt={message.author}
                  className="size-full object-cover"
                  width={32}
                  height={32}
                />
              ) : message.isStaff && ticket.assigneeImage ? (
                <Image
                  src={ticket.assigneeImage}
                  alt={message.author}
                  className="size-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <div
                  className={`flex size-full items-center justify-center text-sm font-medium ${
                    "isBot" in message && message.isBot
                      ? "bg-purple-100 text-purple-600"
                      : "isStaff" in message && message.isStaff
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {message.author[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{message.author}</span>
                <span className="text-xs text-gray-500">{message.timestamp}</span>
                {"editedAt" in message && message.editedAt && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
                {"isBot" in message && message.isBot && (
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-600">
                    Bot
                  </span>
                )}
                {"isStaff" in message && message.isStaff && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                    Staff
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-700">
                {renderContentWithMentions(message.content)}
                {/* Display embeds if present and not already rendered as GIF */}
                {"embeds" in message &&
                  message.embeds &&
                  Array.isArray(message.embeds) &&
                  message.embeds.length > 0 &&
                  !containsRenderedGif(message.content) && (
                    <div className="mt-2 space-y-2">
                      {message.embeds.map((embed: Record<string, unknown>, index: number) => (
                        <div
                          key={index}
                          className="rounded border-l-4 border-blue-500 bg-gray-50 py-2 pl-3"
                        >
                          {typeof embed["title"] === "string" && embed["title"] && (
                            <div className="text-sm font-bold">{embed["title"]}</div>
                          )}
                          {typeof embed["description"] === "string" && embed["description"] && (
                            <div className="mt-1 text-sm text-gray-600">
                              {renderContentWithMentions(embed["description"])}
                            </div>
                          )}
                          {/* Display embed fields (form responses) */}
                          {Array.isArray(embed["fields"]) && embed["fields"].length > 0 && (
                            <div className="mt-3 space-y-2">
                              {(embed["fields"] as Record<string, unknown>[]).map(
                                (field: Record<string, unknown>, fieldIndex: number) => (
                                  <div key={fieldIndex} className="border-t border-gray-200 pt-2">
                                    <div className="mb-1 text-xs font-medium text-gray-700">
                                      {field["name"] as string}
                                    </div>
                                    <div className="rounded border-l-2 border-gray-300 bg-white p-2 text-sm text-gray-800">
                                      {(field["value"] as string).replace(/^>>> /, "")}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                {/* Display attachments if present */}
                {"attachments" in message &&
                  message.attachments &&
                  Array.isArray(message.attachments) &&
                  message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map(
                        (attachment: Record<string, unknown>, index: number) => (
                          <div key={index} className="text-xs text-blue-600">
                            📎{" "}
                            {(attachment["filename"] as string) ||
                              `Attachment ${String(index + 1)}`}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
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
