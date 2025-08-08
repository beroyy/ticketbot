import Image from "next/image";
import { EmojiProgressIcon } from "@/components/emoji-progress-icon";
import { StatusBadge } from "@/components/status-badge";
import { RiDeleteBackLine } from "react-icons/ri";
import { formatDate } from "@/lib/utils";
import type { Ticket } from "@/features/tickets/types";
import {
  EMOJI_PROGRESS_SIZE,
  EMOJI_PROGRESS_STROKE_WIDTH,
  TICKET_CARD_STYLES,
  DEFAULT_URGENCY,
  AVATAR_SIZES,
} from "@/features/tickets/constants";

type TicketCardProps = {
  ticket: Ticket;
  isSelected?: boolean;
  onClick?: () => void;
};

export function TicketCard({ ticket, isSelected, onClick }: TicketCardProps) {
  const displayName =
    (ticket.openerMetadata as { displayName?: string } | undefined)?.displayName ||
    ticket.opener ||
    "Unknown User";

  return (
    <div
      className="cursor-pointer rounded-2xl p-4 transition-all duration-200"
      style={isSelected ? TICKET_CARD_STYLES.SELECTED : TICKET_CARD_STYLES.DEFAULT}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <EmojiProgressIcon
            percentage={ticket.progress}
            size={EMOJI_PROGRESS_SIZE}
            strokeWidth={EMOJI_PROGRESS_STROKE_WIDTH}
          />
          <div className="flex items-center space-x-2">
            <span className="text-lg text-[#525866]">
              ID <span className="tracking-wider">{ticket.id}</span>
            </span>
            <span className="text-sm text-gray-500">{formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        <UserAvatar
          image={ticket.openerImage || ticket.openerAvatar}
          name={ticket.opener}
          displayName={displayName}
        />
      </div>

      <div className="mb-4 flex items-center space-x-3.5">
        <div className="-ml-1.5 flex items-center space-x-0.5">
          <div className="flex size-10 items-center justify-center rounded">
            <RiDeleteBackLine className="size-6 rotate-180 text-[#3F40E3]" strokeWidth={0.2} />
          </div>
          <span className="text-xl font-bold text-gray-900">{ticket.type}</span>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <TicketInfoGrid
        urgency={ticket.urgency || DEFAULT_URGENCY}
        awaitingResponse={ticket.awaitingResponse}
        lastMessage={ticket.lastMessage}
      />
    </div>
  );
}

type UserAvatarProps = {
  image?: string | null;
  name?: string | null;
  displayName: string;
};

function UserAvatar({ image, name, displayName }: UserAvatarProps) {
  return (
    <div className="flex items-center space-x-2.5">
      <div className="size-6 overflow-hidden rounded-full">
        {image ? (
          <Image
            src={image}
            alt={name || "Ticket opener"}
            className="size-full object-cover"
            width={AVATAR_SIZES.SMALL}
            height={AVATAR_SIZES.SMALL}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gray-200 text-xs font-medium text-gray-600">
            {name ? (name[0]?.toUpperCase() ?? "?") : "?"}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-900">{displayName}</span>
    </div>
  );
}

type TicketInfoGridProps = {
  urgency: string;
  awaitingResponse: string;
  lastMessage: string;
};

function TicketInfoGrid({ urgency, awaitingResponse, lastMessage }: TicketInfoGridProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div>
        <div className="mb-1.5 text-sm text-gray-500">Urgency</div>
        <div className="font-medium text-gray-900">{urgency}</div>
      </div>
      <div>
        <div className="mb-1.5 text-sm text-gray-500">Awaiting Response</div>
        <div className="font-medium text-gray-900">{awaitingResponse}</div>
      </div>
      <div>
        <div className="mb-1.5 text-sm text-gray-500">Last Message</div>
        <div className="font-medium text-gray-900">{lastMessage}</div>
      </div>
    </div>
  );
}
