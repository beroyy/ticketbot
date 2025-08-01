import { useTicketUIActions, useTicketFilters } from "@/features/tickets/stores/tickets-ui-store";
import { Badge } from "@/components/ui/badge";
import { Calendar, X } from "lucide-react";

export type FilterState = {
  status: string[];
  type: string[];
  assignee: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

export function ActiveFilters() {
  const filters = useTicketFilters();
  const { setFilters } = useTicketUIActions();

  const removeFilter = (key: keyof FilterState, value: string) => {
    if (key === "dateRange") return;

    const currentValues = filters[key];
    const newValues = currentValues.filter((v) => v !== value);
    setFilters({ [key]: newValues });
  };

  const clearDateRange = () => {
    setFilters({
      dateRange: { from: null, to: null },
    });
  };

  const activeFilters = [
    ...filters.status.map((status) => ({ key: "status", value: status, label: status })),
    ...filters.type.map((type) => ({ key: "type", value: type, label: type })),
    ...filters.assignee.map((assignee) => ({ key: "assignee", value: assignee, label: assignee })),
  ];

  const hasDateRange = filters.dateRange.from || filters.dateRange.to;

  if (activeFilters.length === 0 && !hasDateRange) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map((filter) => (
        <Badge
          key={`${filter.key}-${filter.value}`}
          variant="secondary"
          className="flex items-center gap-1"
        >
          {filter.label}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter(filter.key as keyof FilterState, filter.value)}
          />
        </Badge>
      ))}
      {hasDateRange && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Date Range
          <X className="h-3 w-3 cursor-pointer" onClick={clearDateRange} />
        </Badge>
      )}
    </div>
  );
}
