# Tickets Feature

## Overview

The tickets feature provides comprehensive support ticket management functionality including listing, filtering, sorting, detailed views, and real-time messaging.

## Architecture

### State Management

The feature uses a dedicated Zustand store with provider pattern:

```typescript
// Store structure
interface TicketsUIState {
  // UI State
  searchQuery: string;
  activeTab: "active" | "closed";
  selectedTicketId: string | null;
  isCollapsed: boolean;
  filters: FilterState;
  sort: SortState;

  // Actions
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: "active" | "closed") => void;
  setSelectedTicketId: (id: string | null) => void;
  setCollapsed: (collapsed: boolean) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setSort: (sort: SortState) => void;
  clearFilters: () => void;
}
```

### Components

- **TicketsStoreProvider** - Provides tickets store context
- **TicketCard** - Individual ticket display in list view
- **TicketDetailView** - Full ticket details with messages
- **TicketFilters** - Filter and sort dropdowns
- **ActiveFilters** - Display of active filter badges
- **TicketForm** - React Hook Form for creating/editing tickets
- **TicketMessages** - Real-time messaging interface
- **ActivityLogModal** - Audit log of ticket actions

### Hooks

- **useTicketQueries** - Query configurations for TanStack Query
- **useTicketMutations** - Create, update, close, claim, assign operations
- **useTicketSummary** - Aggregated statistics
- **useTicketUIState** - UI state management hooks

### Data Flow

1. **Page loads** → TicketsStoreProvider wraps content
2. **Query data** → useQuery with ticketQueries.all()
3. **Filter/Sort** → Local state updates trigger re-filtering
4. **Selection** → Updates selectedTicketId in store
5. **Actions** → Mutations invalidate queries and show notifications

## Usage

### Basic Page Setup

```tsx
import { TicketsStoreProvider } from "@/features/tickets/stores/tickets-store-provider";

export default function TicketsPage() {
  return (
    <TicketsStoreProvider>
      <TicketsContent />
    </TicketsStoreProvider>
  );
}
```

### Using Store Hooks

```tsx
import {
  useTicketFilters,
  useSearchQuery,
  useTicketUIActions,
} from "@/features/tickets/stores/tickets-ui-store";

function TicketList() {
  const filters = useTicketFilters();
  const searchQuery = useSearchQuery();
  const { setFilters, setSearchQuery } = useTicketUIActions();

  // Component logic
}
```

### Performing Actions

```tsx
import { useClaimTicket, useCloseTicket } from "@/features/tickets/hooks/use-ticket-mutations";

function TicketActions({ ticketId }: { ticketId: string }) {
  const claimMutation = useClaimTicket();
  const closeMutation = useCloseTicket();

  return (
    <>
      <Button onClick={() => claimMutation.mutate(ticketId)}>Claim Ticket</Button>
      <Button onClick={() => closeMutation.mutate({ id: ticketId })}>Close Ticket</Button>
    </>
  );
}
```

## Filter System

### Filter State

```typescript
interface FilterState {
  status: string[]; // ["OPEN", "IN_PROGRESS", "WAITING"]
  type: string[]; // ["Bugs & Error", "General Support"]
  assignee: string[]; // User IDs or "Unassigned"
  dateRange: {
    from: string | null;
    to: string | null;
  };
}
```

### Sort Options

- **createdAt** - Date created (default)
- **status** - Ticket status
- **progress** - Completion percentage
- **lastMessage** - Most recent activity

## Permissions

The feature integrates with the permission system:

- **TICKET_VIEW_SELF** - View own tickets
- **TICKET_VIEW_CLAIMED** - View claimed tickets
- **TICKET_VIEW_ALL** - View all tickets
- **TICKET_CLAIM** - Claim tickets
- **TICKET*CLOSE*\*** - Close tickets based on ownership
- **TICKET_ASSIGN** - Assign tickets to others

## Real-time Updates

The messaging system uses polling for updates:

```tsx
// In ticket-messages.tsx
const { data: messages } = useQuery({
  ...ticketQueries.messages(ticketId),
  refetchInterval: 5000, // Poll every 5 seconds
});
```

## Performance Optimizations

1. **Atomic selectors** prevent unnecessary re-renders
2. **Local filtering** avoids server round-trips
3. **Memoized computations** for filtered/sorted lists
4. **Virtualized lists** for large ticket volumes (planned)

## Testing Considerations

- Mock store provider for component tests
- Test filter/sort logic independently
- Verify permission checks in mutations
- Test real-time update behavior
