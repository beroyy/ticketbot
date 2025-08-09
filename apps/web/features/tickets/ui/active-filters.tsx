import { useTicketsStore } from "@/features/tickets/tickets-store";
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
  const filters = useTicketsStore((s) => s.filters);
  const setFilters = useTicketsStore((s) => s.setFilters);

  const removeFilter = (key: keyof FilterState, value: string) => {
    if (key === "dateRange") return;

    const currentValues = filters[key] || [];
    const newValues = currentValues.filter((v: string) => v !== value);
    setFilters({ ...filters, [key]: newValues });
  };

  const clearDateRange = () => {
    setFilters({
      ...filters,
      dateRange: { from: null, to: null },
    });
  };

  const activeFilters = [
    ...(filters.status || []).map((status: string) => ({ key: "status", value: status, label: status })),
    ...(filters.type || []).map((type: string) => ({ key: "type", value: type, label: type })),
    ...(filters.assignee || []).map((assignee: string) => ({ key: "assignee", value: assignee, label: assignee })),
  ];

  const hasDateRange = filters.dateRange?.from || filters.dateRange?.to;

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
