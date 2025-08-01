import Image from "next/image";
import { MessageContent, containsRenderedGif } from "./message-content";
import type { FormattedMessage } from "@/features/tickets/ui/transcripts/utils";
import type { Ticket } from "@/features/tickets/types";

type MessageItemProps = {
  message: FormattedMessage;
  ticket: Ticket;
};

export function MessageItem({ message, ticket }: MessageItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <MessageAvatar message={message} ticket={ticket} />
      <div className="flex-1">
        <MessageHeader message={message} />
        <div className="text-sm text-gray-700">
          <MessageContent content={message.content} ticket={ticket} />
          <MessageEmbed
            embeds={message.embeds}
            ticket={ticket}
            contentHasGif={containsRenderedGif(message.content)}
          />
          <MessageAttachments attachments={message.attachments} />
        </div>
      </div>
    </div>
  );
}

type MessageAvatarProps = {
  message: FormattedMessage;
  ticket: Ticket;
};

function MessageAvatar({ message, ticket }: MessageAvatarProps) {
  const getAvatarImage = () => {
    if (message.avatarUrl) return message.avatarUrl;
    if (!message.isStaff && (ticket.openerImage || ticket.openerAvatar)) {
      return ticket.openerImage || ticket.openerAvatar || "";
    }
    if (message.isStaff && ticket.assigneeImage) {
      return ticket.assigneeImage;
    }
    return null;
  };

  const avatarImage = getAvatarImage();

  return (
    <div className="h-8 w-8 overflow-hidden rounded-full">
      {avatarImage ? (
        <Image
          src={avatarImage}
          alt={message.author}
          className="size-full object-cover"
          width={32}
          height={32}
        />
      ) : (
        <div
          className={`flex size-full items-center justify-center text-sm font-medium ${
            message.isBot
              ? "bg-purple-100 text-purple-600"
              : message.isStaff
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-200 text-gray-600"
          }`}
        >
          {message.author[0]?.toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
}

type MessageHeaderProps = {
  message: FormattedMessage;
};

function MessageHeader({ message }: MessageHeaderProps) {
  return (
    <div className="mb-1 flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-900">{message.author}</span>
      <span className="text-xs text-gray-500">{message.timestamp}</span>
      {message.editedAt && <span className="text-xs text-gray-400">(edited)</span>}
      {message.isBot && (
        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-600">Bot</span>
      )}
      {message.isStaff && (
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">Staff</span>
      )}
    </div>
  );
}

type MessageAttachmentsProps = {
  attachments: Record<string, unknown>[] | null | undefined;
};

function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {attachments.map((attachment: Record<string, unknown>, index: number) => (
        <div key={index} className="text-xs text-blue-600">
          📎 {(attachment["filename"] as string) || `Attachment ${String(index + 1)}`}
        </div>
      ))}
    </div>
  );
}

type MessageEmbedProps = {
  embeds: Record<string, unknown>[] | null | undefined;
  ticket: Ticket;
  contentHasGif: boolean;
};

function MessageEmbed({ embeds, ticket, contentHasGif }: MessageEmbedProps) {
  if (!embeds || !Array.isArray(embeds) || embeds.length === 0 || contentHasGif) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {embeds.map((embed: Record<string, unknown>, index: number) => (
        <div key={index} className="rounded border-l-4 border-blue-500 bg-gray-50 py-2 pl-3">
          {typeof embed["title"] === "string" && embed["title"] && (
            <div className="text-sm font-bold">{embed["title"]}</div>
          )}
          {typeof embed["description"] === "string" && embed["description"] && (
            <div className="mt-1 text-sm text-gray-600">
              <MessageContent content={embed["description"]} ticket={ticket} />
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
  );
}
