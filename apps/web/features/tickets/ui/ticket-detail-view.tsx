import React from "react";
import type { Ticket } from "@/features/tickets/types";
import { useTicketMessages } from "@/features/tickets/hooks";
import { Transcripts } from "@/features/tickets/ui/transcripts";
import { useSmartRefetch } from "@/hooks/use-smart-refetch";
import { useAuth } from "@/features/auth/auth-provider-ssr";
import { ActivityLog } from "./activity-log";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { BiSolidArrowFromRight } from "react-icons/bi";
import { TicketUserInfo } from "./ticket-user-info";
import { useTicketCollapsed } from "@/features/tickets/stores/tickets-ui-store";

type TicketDetailViewProps = {
  ticket: Ticket;
  onClose: () => void;
  onCollapseToggle?: () => void;
};

export function TicketDetailView({ ticket, onClose, onCollapseToggle }: TicketDetailViewProps) {
  const isCollapsed = useTicketCollapsed();
  const { selectedGuildId } = useAuth();
  const smartInterval = useSmartRefetch("critical");

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
      <div className="flex h-full flex-1 flex-col bg-white pb-[74px] transition-all duration-300 ease-in-out">
        <TicketDetailHeader
          onClose={onClose}
          onCollapseToggle={onCollapseToggle}
          isCollapsed={isCollapsed}
        />

        <div className="flex flex-1 gap-6 px-6 py-4">
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
  isCollapsed?: boolean;
};

function TicketDetailHeader({ onClose, onCollapseToggle, isCollapsed }: TicketDetailHeaderProps) {
  return (
    <div className="mt-1 bg-white px-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" className="p-1.5" onClick={onCollapseToggle}>
          <BiSolidArrowFromRight
            className={`size-5 transition-transform duration-200 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
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
