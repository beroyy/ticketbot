import type { Ticket } from "@/features/tickets/types";
import { useActivityLog } from "@/features/tickets/hooks/use-activity-log";
import { ActivityLogList } from "./activity-log-list";

interface ActivityLogContainerProps {
  ticket: Ticket;
  className?: string;
}

export function ActivityLogContainer({ ticket, className }: ActivityLogContainerProps) {
  const { activityLog, isLoading, error } = useActivityLog(ticket.id);

  return (
    <div className={className}>
      <ActivityLogList
        entries={activityLog}
        isLoading={isLoading}
        error={error}
        ticketId={ticket.id}
      />
    </div>
  );
}