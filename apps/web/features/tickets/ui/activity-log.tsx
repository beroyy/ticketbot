import { Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Simple type instead of importing complex types
type ActivityLogEntry = {
  id: string;
  action: string;
  timestamp: string;
  performedBy?: {
    username?: string;
    global_name?: string;
  };
  details?: string | object;
};

type ActivityLogProps = {
  ticketId: string;
  className?: string;
};

export function ActivityLog({ ticketId, className }: ActivityLogProps) {
  // Direct query, no wrapper
  const { data: activityLog = [], isLoading, error } = useQuery({
    queryKey: ['activity-log', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}/activity`);
      if (!response.ok) throw new Error('Failed to fetch activity log');
      return response.json() as Promise<ActivityLogEntry[]>;
    },
  });

  return (
    <div className={className}>
      <ActivityLogList
        entries={activityLog}
        isLoading={isLoading}
        error={error}
        ticketId={ticketId}
      />
    </div>
  );
}

type ActivityLogListProps = {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  error: Error | string | null;
  ticketId: string;
};

function ActivityLogList({ entries, isLoading, error, ticketId }: ActivityLogListProps) {
  const errorMessage = error ? (typeof error === 'object' && 'message' in error ? error.message : String(error)) : null;
  // Clean ticket ID by removing # if present
  const cleanTicketId = ticketId.replace("#", "");

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="text-gray-500">Loading activity log...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="text-red-500">{errorMessage}</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-gray-500">No activity found for this ticket.</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {entries.map((entry, index) => {
        const displayName = entry.performedBy
          ? entry.performedBy.global_name || entry.performedBy.username || "Unknown"
          : "System";

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
                    <span className="font-medium text-blue-600">#{actionText.split("#")[1] || ""}</span>
                  </>
                ) : (
                  actionText
                )}
              </p>
              {entry.details && (
                <p className="mt-1 text-xs text-gray-500">
                  {typeof entry.details === "string"
                    ? entry.details
                    : JSON.stringify(entry.details, null, 2)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
