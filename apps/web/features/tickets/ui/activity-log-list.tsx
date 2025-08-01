import { Calendar } from "lucide-react";
import type { ActivityLogEntry } from "@/features/tickets/types";
import { formatAction } from "@/features/tickets/utils/activity-log";

interface ActivityLogListProps {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  error: string | null;
  ticketId: string;
}

export function ActivityLogList({ entries, isLoading, error, ticketId }: ActivityLogListProps) {
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
        <div className="text-red-500">{error}</div>
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
          ? entry.performedBy.global_name || entry.performedBy.username
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
                    <span className="font-medium text-blue-600">#{actionText.split("#")[1]}</span>
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
