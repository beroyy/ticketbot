import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Calendar } from "lucide-react";
import type { Ticket } from "@/lib/tickets-store";
import { apiClient } from "@/lib/api";

interface ActivityLogEntry {
  id: number;
  timestamp: string;
  action: string;
  details?: string | null;
  performed_by: {
    id: string;
    username: string;
    global_name?: string | null;
  };
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
}

// Format action text for display
const formatAction = (action: string, ticketId: string, performedBy: string): string => {
  switch (action) {
    case "opened":
      return `${performedBy} opened ticket #${ticketId}`;
    case "claimed":
      return `${performedBy} claimed ticket #${ticketId}`;
    case "closed":
      return `${performedBy} closed ticket #${ticketId}`;
    case "close_request_denied":
      return `${performedBy} denied close request for ticket #${ticketId}`;
    case "auto_closed":
      return `Ticket #${ticketId} was automatically closed`;
    case "transferred":
      return `${performedBy} transferred ticket #${ticketId}`;
    default:
      return `${performedBy} performed action: ${action}`;
  }
};

export function ActivityLogModal({ isOpen, onClose, ticket }: ActivityLogModalProps) {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityLog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Encode the ticket ID to handle the # symbol
      const encodedTicketId = encodeURIComponent(ticket.id);
      const data = await apiClient.get<ActivityLogEntry[]>(`/tickets/${encodedTicketId}/activity`);
      setActivityLog(data);
    } catch (err) {
      setError("Failed to load activity log");
      console.error("Error fetching activity log:", err);
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    if (isOpen && ticket.id) {
      void fetchActivityLog();
    }
  }, [isOpen, ticket.id, fetchActivityLog]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
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
          {loading && (
            <div className="py-8 text-center">
              <div className="text-gray-500">Loading activity log...</div>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <div className="text-red-500">{error}</div>
            </div>
          )}

          {!loading && !error && activityLog.length === 0 && (
            <div className="py-8 text-center">
              <div className="text-gray-500">No activity found for this ticket.</div>
            </div>
          )}

          {!loading && !error && activityLog.length > 0 && (
            <div className="divide-y divide-gray-100">
              {activityLog.map((entry, index) => {
                const displayName = entry.performed_by.global_name || entry.performed_by.username;
                // Clean ticket ID by removing # if present
                const cleanTicketId = ticket.id.replace("#", "");
                const actionText = formatAction(entry.action, cleanTicketId, displayName);
                const timestamp = new Date(entry.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });

                return (
                  <div
                    key={entry.id}
                    className={`flex items-start space-x-3 ${index === 0 ? "pb-4" : "py-4"}`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500">{timestamp}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {actionText.includes("#") ? (
                          <>
                            {actionText.split("#")[0]}
                            <span className="font-medium text-blue-600">
                              #{actionText.split("#")[1]}
                            </span>
                          </>
                        ) : (
                          actionText
                        )}
                      </p>
                      {entry.details && (
                        <p className="mt-1 text-xs text-gray-500">{entry.details}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
