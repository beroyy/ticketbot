import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TicketCard } from "./ticket-card";
import type { Ticket } from "@/features/tickets/types";

type TicketsListProps = {
  tickets: Ticket[];
  selectedTicketId?: string | null;
  onTicketSelect: (ticketId: string) => void;
  isLoading: boolean;
  error: Error | null;
  activeTab: "active" | "closed";
  isCompact?: boolean;
};

export function TicketsList({
  tickets,
  selectedTicketId,
  onTicketSelect,
  isLoading,
  error,
  activeTab,
  isCompact = false,
}: TicketsListProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (tickets.length === 0) {
    return <EmptyState activeTab={activeTab} />;
  }

  return (
    <div
      className={isCompact ? "space-y-3" : "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"}
    >
      {tickets.map((ticket, index) => (
        <TicketCard
          key={`${ticket.id}-${index.toString()}`}
          ticket={ticket}
          isSelected={selectedTicketId === ticket.id}
          onClick={() => onTicketSelect(ticket.id)}
        />
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ErrorState({ error }: { error: Error | null }) {
  return (
    <Alert variant="destructive" className="m-4">
      <AlertDescription>
        {error instanceof Error ? error.message : "Failed to load tickets"}
      </AlertDescription>
    </Alert>
  );
}

function EmptyState({ activeTab }: { activeTab: "active" | "closed" }) {
  return (
    <div className="py-12 text-center">
      <div className="text-gray-500">No {activeTab} tickets found</div>
    </div>
  );
}
