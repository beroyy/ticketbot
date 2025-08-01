import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Ticket } from "@/features/tickets/types";
import { ActivityLogContainer } from "./activity-log-container";

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
}

export function ActivityLogModal({ isOpen, onClose, ticket }: ActivityLogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Activity List */}
        <div className="max-h-96 overflow-y-auto p-6">
          <ActivityLogContainer ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
