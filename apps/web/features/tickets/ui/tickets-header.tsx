interface TicketsHeaderProps {
  isDetailView?: boolean;
}

export function TicketsHeader({ isDetailView }: TicketsHeaderProps) {
  if (isDetailView) return null;

  return (
    <div className="mb-4 border-b pb-4">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Tickets</h1>
      <p className="text-base text-gray-500">
        See all the ticket history, status, progress and chat
      </p>
    </div>
  );
}