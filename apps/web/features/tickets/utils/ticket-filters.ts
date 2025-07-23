import type { Ticket } from "@/features/tickets/types";

// Local type definitions to avoid coupling with store
interface FilterState {
  status: string[];
  type: string[];
  assignee: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

interface SortState {
  field: "createdAt" | "status" | "progress" | "lastMessage";
  direction: "asc" | "desc";
}

/**
 * Filters tickets based on the provided filter state
 */
export function filterTickets(
  tickets: Ticket[],
  filters: FilterState,
  searchQuery: string = ""
): Ticket[] {
  return tickets.filter((ticket) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.subject && ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ticket.assignee && ticket.assignee.toLowerCase().includes(searchQuery.toLowerCase()));

    // Status filter
    const matchesStatus = filters.status.length === 0 || filters.status.includes(ticket.status);

    // Type filter
    const matchesType = filters.type.length === 0 || filters.type.includes(ticket.type);

    // Assignee filter
    const matchesAssignee =
      filters.assignee.length === 0 ||
      (ticket.assignee && filters.assignee.includes(ticket.assignee)) ||
      (filters.assignee.includes("Unassigned") && !ticket.assignee);

    // Date range filter
    const matchesDate =
      (!filters.dateRange.from || new Date(ticket.createdAt) >= new Date(filters.dateRange.from)) &&
      (!filters.dateRange.to || new Date(ticket.createdAt) <= new Date(filters.dateRange.to));

    return matchesSearch && matchesStatus && matchesType && matchesAssignee && matchesDate;
  });
}

/**
 * Sorts tickets based on the provided sort state
 */
export function sortTickets(tickets: Ticket[], sort: SortState): Ticket[] {
  return [...tickets].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sort.field) {
      case "createdAt":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "progress":
        aValue = a.progress;
        bValue = b.progress;
        break;
      case "lastMessage":
        aValue = a.lastMessage;
        bValue = b.lastMessage;
        break;
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
    }

    if (sort.direction === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });
}

/**
 * Filters and sorts tickets in one operation
 */
export function filterAndSortTickets(
  tickets: Ticket[],
  filters: FilterState,
  sort: SortState,
  searchQuery: string = ""
): Ticket[] {
  const filtered = filterTickets(tickets, filters, searchQuery);
  return sortTickets(filtered, sort);
}

/**
 * Finds a ticket by ID from either active or closed tickets
 */
export function findTicketById(
  ticketId: string | null,
  activeTickets: Ticket[],
  closedTickets: Ticket[]
): Ticket | null {
  if (!ticketId) return null;

  return (
    activeTickets.find((t) => t.id === ticketId) ||
    closedTickets.find((t) => t.id === ticketId) ||
    null
  );
}

/**
 * Gets unique values for filter options
 */
export function getFilterOptions(tickets: Ticket[]) {
  const statuses = [...new Set(tickets.map((t) => t.status))];
  const types = [...new Set(tickets.map((t) => t.type))];
  const assignees = [
    ...new Set(tickets.filter((t) => t.assignee).map((t) => t.assignee as string)),
  ];

  return {
    statuses,
    types,
    assignees: ["Unassigned", ...assignees],
  };
}
