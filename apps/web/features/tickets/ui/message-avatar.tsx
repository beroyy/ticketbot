import Image from "next/image";
import type { FormattedMessage } from "@/features/tickets/utils/message-formatters";
import type { Ticket } from "@/features/tickets/types";

interface MessageAvatarProps {
  message: FormattedMessage;
  ticket: Ticket;
}

export function MessageAvatar({ message, ticket }: MessageAvatarProps) {
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