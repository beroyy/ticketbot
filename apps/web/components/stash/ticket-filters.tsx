import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Calendar, X } from "lucide-react";
import type { FilterState, SortState } from "@/lib/tickets-store";
import { useTicketsStore } from "@/lib/tickets-store";

interface FilterDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterDropdown({ isOpen, onToggle }: FilterDropdownProps) {
  const { filters, setFilters, clearFilters } = useTicketsStore();

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    if (key === "dateRange") return;

    const currentValues = filters[key];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    setFilters({ [key]: newValues });
  };

  const handleDateChange = (type: "from" | "to", value: string) => {
    setFilters({
      dateRange: {
        ...filters.dateRange,
        [type]: value || null,
      },
    });
  };

  const getActiveFilterCount = () => {
    return (
      filters.status.length +
      filters.type.length +
      filters.assignee.length +
      (filters.dateRange.from || filters.dateRange.to ? 1 : 0)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border bg-white p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          {getActiveFilterCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status Filter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In Progress" },
              { value: "on_hold", label: "On Hold" },
              { value: "closed", label: "Closed" },
            ].map((status) => (
              <Button
                key={status.value}
                variant={filters.status.includes(status.value) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  handleFilterChange("status", status.value);
                }}
                className="h-8"
              >
                {status.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
          <div className="flex flex-wrap gap-2">
            {["Bugs & Error", "Dev Application", "General Support"].map((type) => (
              <Button
                key={type}
                variant={filters.type.includes(type) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  handleFilterChange("type", type);
                }}
                className="h-8"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Assignee</label>
          <div className="flex flex-wrap gap-2">
            {["Unassigned"].map((assignee) => (
              <Button
                key={assignee}
                variant={filters.assignee.includes(assignee) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  handleFilterChange("assignee", assignee);
                }}
                className="h-8"
              >
                {assignee}
              </Button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">From</label>
              <Input
                type="date"
                value={filters.dateRange.from || ""}
                onChange={(e) => {
                  handleDateChange("from", e.target.value);
                }}
                className="h-8"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">To</label>
              <Input
                type="date"
                value={filters.dateRange.to || ""}
                onChange={(e) => {
                  handleDateChange("to", e.target.value);
                }}
                className="h-8"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SortDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SortDropdown({ isOpen, onToggle }: SortDropdownProps) {
  const { sort, setSort } = useTicketsStore();

  const sortOptions = [
    { field: "createdAt" as const, label: "Date Created" },
    { field: "status" as const, label: "Status" },
    { field: "progress" as const, label: "Progress" },
    { field: "lastMessage" as const, label: "Last Message" },
  ];

  const handleSortChange = (field: SortState["field"]) => {
    if (sort.field === field) {
      setSort({
        field,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSort({ field, direction: "desc" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border bg-white p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Sort by</h3>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {sortOptions.map((option) => (
          <Button
            key={option.field}
            variant={sort.field === option.field ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              handleSortChange(option.field);
            }}
            className="w-full justify-between"
          >
            <span>{option.label}</span>
            {sort.field === option.field &&
              (sort.direction === "asc" ? (
                <ArrowUpNarrowWide className="h-4 w-4" />
              ) : (
                <ArrowDownNarrowWide className="h-4 w-4" />
              ))}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ActiveFilters() {
  const { filters, setFilters } = useTicketsStore();

  const removeFilter = (category: keyof FilterState, value: string) => {
    if (category === "dateRange") return;

    const currentValues = filters[category];
    const newValues = currentValues.filter((v) => v !== value);
    setFilters({ [category]: newValues });
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      open: "Open",
      in_progress: "In Progress",
      on_hold: "On Hold",
      closed: "Closed",
    };
    return statusMap[status] || status;
  };

  const clearDateRange = () => {
    setFilters({
      dateRange: { from: null, to: null },
    });
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.type.length > 0 ||
    filters.assignee.length > 0 ||
    filters.dateRange.from ||
    filters.dateRange.to;

  if (!hasActiveFilters) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
      {filters.status.map((status) => (
        <Badge key={`status-${status}`} variant="secondary" className="flex items-center gap-1">
          Status: {getStatusLabel(status)}
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-auto p-0"
            onClick={() => {
              removeFilter("status", status);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {filters.type.map((type) => (
        <Badge key={`type-${type}`} variant="secondary" className="flex items-center gap-1">
          Type: {type}
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-auto p-0"
            onClick={() => {
              removeFilter("type", type);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {filters.assignee.map((assignee) => (
        <Badge key={`assignee-${assignee}`} variant="secondary" className="flex items-center gap-1">
          Assignee: {assignee}
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-auto p-0"
            onClick={() => {
              removeFilter("assignee", assignee);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {(filters.dateRange.from || filters.dateRange.to) && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {filters.dateRange.from && filters.dateRange.to
            ? `${filters.dateRange.from} to ${filters.dateRange.to}`
            : filters.dateRange.from
              ? `From ${filters.dateRange.from}`
              : filters.dateRange.to
                ? `Until ${filters.dateRange.to}`
                : ""}
          <Button variant="ghost" size="sm" className="ml-1 h-auto p-0" onClick={clearDateRange}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  );
}
