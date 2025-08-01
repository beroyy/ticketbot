import React, { useState } from "react";
import type { Ticket } from "@/features/tickets/types";
import { useTicketMessages } from "@/features/tickets/queries";
import { TicketMessages } from "@/features/tickets/ui/ticket-messages";
import { useSmartRefetch } from "@/hooks/use-smart-refetch";
import { useAuth } from "@/features/auth/auth-provider";
import { ActivityLogContainer } from "./activity-log-container";
import { TicketDetailHeader } from "./ticket-detail-header";
import { TicketUserInfo } from "./ticket-user-info";

interface TicketDetailViewProps {
  ticket: Ticket;
  onClose: () => void;
}

export function TicketDetailView({ ticket, onClose }: TicketDetailViewProps) {
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
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
            <TicketMessages
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
                <ActivityLogContainer ticket={ticket} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
