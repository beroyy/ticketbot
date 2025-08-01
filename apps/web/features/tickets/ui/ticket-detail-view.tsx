import React from "react";
import type { Ticket } from "@/features/tickets/types";
import { useTicketMessages } from "@/features/tickets/queries";
import { Transcripts } from "@/features/tickets/ui/transcripts";
import { useSmartRefetch } from "@/hooks/use-smart-refetch";
import { useAuth } from "@/features/auth/auth-provider";
import { ActivityLog } from "./activity-log";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { BiSolidArrowFromRight } from "react-icons/bi";
import { TicketUserInfo } from "./ticket-user-info";

type TicketDetailViewProps = {
  ticket: Ticket;
  onClose: () => void;
};

export function TicketDetailView({ ticket, onClose }: TicketDetailViewProps) {
  const isCollapsed = false; // Can be added to global store if needed
  const { selectedGuildId } = useAuth();

  // Use smart refetch for critical message data
  const smartInterval = useSmartRefetch("critical");

  // Fetch real messages for this ticket
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = useTicketMessages(ticket.id, selectedGuildId, smartInterval);

  return (
    <div className="flex w-full py-6">
      {!isCollapsed && (
        <div className="z-10 ml-6 h-[150%] -translate-y-1/4 border-l border-gray-200"></div>
      )}
      <div className="flex h-full flex-col bg-white pb-[74px]">
        <TicketDetailHeader onClose={onClose} />

        {/* Content */}
        <div className="flex flex-1 gap-6 px-6 py-4">
          {/* Main Chat Area - Rounded Container */}
          <div className="nice-gray-border flex flex-1 flex-col rounded-2xl border bg-white">
            <TicketUserInfo ticket={ticket} />
            <Transcripts
              messages={messagesData}
              ticket={ticket}
              isLoading={messagesLoading}
              error={messagesError}
            />
          </div>

          <div className="nice-gray-border flex w-1/2 flex-col rounded-2xl border bg-white">
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Activity Log</h2>
              <div className="max-h-96 overflow-y-auto">
                <ActivityLog ticket={ticket} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type TicketDetailHeaderProps = {
  onClose: () => void;
  onCollapseToggle?: () => void;
};

function TicketDetailHeader({ onClose, onCollapseToggle }: TicketDetailHeaderProps) {
  return (
    <div className="mt-1 bg-white px-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="p-1.5"
          onClick={() => {
            onCollapseToggle?.();
            console.log("Collapse toggle clicked");
          }}
        >
          <BiSolidArrowFromRight className="size-5" />
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="flex items-center space-x-2 px-2.5 py-1 text-base text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <span>Close</span>
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
