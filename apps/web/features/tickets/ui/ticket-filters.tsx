import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Calendar, X } from "lucide-react";
import { useTicketFilters, useTicketSort, useTicketActions } from "@/shared/stores/app-store";

type FilterState = {
  status: string[];
  type: string[];
  assignee: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

type SortState = {
  field: "createdAt" | "status" | "progress" | "lastMessage";
  direction: "asc" | "desc";
};

interface FilterDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterDropdown({ isOpen }: FilterDropdownProps) {
  const filters = useTicketFilters();
  const { updateFilters, resetFilters } = useTicketActions();

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    if (key === "dateRange") return;

    const currentValues = filters[key];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    updateFilters({ [key]: newValues });
  };

  const handleDateChange = (type: "from" | "to", value: string) => {
    updateFilters({
      dateRange: {
        ...filters.dateRange,
        [type]: value,
      },
    });
  };

  const handleClearAll = () => {
    resetFilters();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        </div>

        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700">Status</label>
            <div className="flex flex-wrap gap-2">
              {["OPEN", "IN_PROGRESS", "WAITING", "CLOSED"].map((status) => (
                <Button
                  key={status}
                  variant={filters.status.includes(status) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("status", status)}
                  className="text-xs"
                >
                  {status.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700">Type</label>
            <div className="flex flex-wrap gap-2">
              {["Bugs & Error", "General Support", "Dev Application"].map((type) => (
                <Button
                  key={type}
                  variant={filters.type.includes(type) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("type", type)}
                  className="text-xs"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700">Assignee</label>
            <div className="flex flex-wrap gap-2">
              {["Unassigned", "Me", "Others"].map((assignee) => (
                <Button
                  key={assignee}
                  variant={filters.assignee.includes(assignee) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("assignee", assignee)}
                  className="text-xs"
                >
                  {assignee}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="date"
                  value={filters.dateRange.from || ""}
                  onChange={(e) => handleDateChange("from", e.target.value)}
                  className="text-xs"
                  placeholder="From"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={filters.dateRange.to || ""}
                  onChange={(e) => handleDateChange("to", e.target.value)}
                  className="text-xs"
                  placeholder="To"
                />
              </div>
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

export function SortDropdown({ isOpen }: SortDropdownProps) {
  const sort = useTicketSort();
  const { updateSort } = useTicketActions();

  const handleSortChange = (field: SortState["field"]) => {
    updateSort({
      field,
      direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc",
    });
  };

  if (!isOpen) return null;

  const sortOptions = [
    { field: "createdAt" as const, label: "Created Date" },
    { field: "status" as const, label: "Status" },
    { field: "progress" as const, label: "Progress" },
    { field: "lastMessage" as const, label: "Last Message" },
  ];

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
      <div className="p-2">
        {sortOptions.map((option) => (
          <Button
            key={option.field}
            variant="ghost"
            size="sm"
            onClick={() => handleSortChange(option.field)}
            className="w-full justify-between text-left"
          >
            <span>{option.label}</span>
            <div className="flex items-center gap-1">
              {sort.field === option.field && (
                <>
                  {sort.direction === "asc" ? (
                    <ArrowUpNarrowWide className="h-4 w-4" />
                  ) : (
                    <ArrowDownNarrowWide className="h-4 w-4" />
                  )}
                </>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ActiveFilters() {
  const filters = useTicketFilters();
  const { updateFilters } = useTicketActions();

  const removeFilter = (key: keyof FilterState, value: string) => {
    if (key === "dateRange") return;

    const currentValues = filters[key];
    const newValues = currentValues.filter((v) => v !== value);
    updateFilters({ [key]: newValues });
  };

  const clearDateRange = () => {
    updateFilters({
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
