import { MessageAvatar } from "./message-avatar";
import { MessageContent, containsRenderedGif } from "./message-content";
import { MessageEmbed } from "./message-embed";
import type { FormattedMessage } from "@/features/tickets/utils/message-formatters";
import type { Ticket } from "@/features/tickets/types";

interface MessageItemProps {
  message: FormattedMessage;
  ticket: Ticket;
}

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

function MessageHeader({ message }: { message: FormattedMessage }) {
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

function MessageAttachments({
  attachments,
}: {
  attachments: Record<string, unknown>[] | null | undefined;
}) {
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