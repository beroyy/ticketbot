import Image from "next/image";
import { UserMetadataPopover } from "./user-metadata-popover";
import type { Ticket } from "@/features/tickets/types";

interface TicketUserInfoProps {
  ticket: Ticket;
}

export function TicketUserInfo({ ticket }: TicketUserInfoProps) {
  const displayName =
    (ticket.openerMetadata as { displayName?: string } | null)?.displayName ||
    ticket.opener ||
    "Unknown User";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center space-x-4">
        <UserMetadataPopover metadata={ticket.openerMetadata}>
          <button className="h-12 w-12 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ticket.openerImage || ticket.openerAvatar ? (
              <Image
                src={ticket.openerImage || ticket.openerAvatar || ""}
                alt={ticket.opener || "Ticket opener"}
                className="size-full rounded-full object-cover"
                width={48}
                height={48}
              />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-orange-100">
                <span className="font-medium text-orange-600">
                  {ticket.opener?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            )}
          </button>
        </UserMetadataPopover>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">{ticket.opener || "Unknown User"}</p>
        </div>
      </div>
      <div className="border-t border-gray-200"></div>
    </div>
  );
}