import React from "react";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Search, ChevronDown } from "lucide-react";
import { RiFilter3Line, RiSortDesc } from "react-icons/ri";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useTicketFilters,
  useTicketSort,
  useTicketUIActions,
} from "@/features/tickets/stores/tickets-ui-store";
import type { FilterState } from "@/features/tickets/ui/active-filters";

type TicketsControlsProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isFilterOpen: boolean;
  onFilterToggle: () => void;
  isSortOpen: boolean;
  onSortToggle: () => void;
  filters: {
    status: string[];
    type: string[];
    assignee: string[];
    dateRange: { from: string | null; to: string | null };
  };
  sort: { field: string };
  isCompact?: boolean;
};

export function TicketsControls({
  searchQuery,
  onSearchChange,
  isFilterOpen,
  onFilterToggle,
  isSortOpen,
  onSortToggle,
  filters,
  sort,
  isCompact = false,
}: TicketsControlsProps) {
  const activeFilterCount =
    filters.status.length +
    filters.type.length +
    filters.assignee.length +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className={`flex items-center ${isCompact ? "space-x-2" : "space-x-3"}`}>
        {/* Search Bar */}
        <div
          className={`nice-gray-border pointer-events-none relative flex ${
            isCompact ? "flex-1" : "w-full"
          }`}
        >
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="AI Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="tracking-subtle border-0 bg-transparent pl-10 text-base shadow-none placeholder:text-[#99A0AE]"
          />
        </div>

        {/* Filter and Sort Buttons */}
        <div className={`relative flex ${isCompact ? "space-x-2" : "space-x-3"}`} data-dropdown>
          {/* Filter Button */}
          <div className="relative flex-1">
            <Button
              variant="ghost"
              className={`nice-gray-border flex w-full items-center justify-center space-x-1 text-base ${
                isCompact ? "px-3" : "px-8"
              }`}
              onClick={onFilterToggle}
            >
              <RiFilter3Line className="size-5 text-[#525866]" strokeWidth={0.2} />
              {!isCompact && <span className="tracking-subtle text-[#525866]">Filter</span>}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <FilterDropdown isOpen={isFilterOpen} onToggle={onFilterToggle} />
          </div>

          {/* Sort Button */}
          <div className="relative flex-1">
            <Button
              variant="ghost"
              className={`nice-gray-border flex w-full items-center text-base ${
                isCompact ? "justify-center px-3" : "justify-between space-x-0.5 px-3"
              }`}
              onClick={onSortToggle}
            >
              <RiSortDesc className="size-5 text-[#99A0AE]" strokeWidth={0.2} />
              {!isCompact && (
                <>
                  <span className="tracking-subtle text-[#525866]">Sort by</span>
                  {sort.field !== "createdAt" && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {sort.field}
                    </Badge>
                  )}
                  <ChevronDown className="size-4 scale-y-110 text-[#99A0AE]" strokeWidth={2.7} />
                </>
              )}
            </Button>
            <SortDropdown isOpen={isSortOpen} onToggle={onSortToggle} />
          </div>
        </div>
      </div>
    </div>
  );
}

type SortState = {
  field: "createdAt" | "status" | "progress" | "lastMessage";
  direction: "asc" | "desc";
};

function FilterDropdown({ isOpen }: { isOpen: boolean; onToggle: () => void }) {
  const filters = useTicketFilters();
  const { setFilters, clearFilters } = useTicketUIActions();

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
        [type]: value,
      },
    });
  };

  const handleClearAll = () => {
    clearFilters();
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

type SortDropdownProps = {
  isOpen: boolean;
  onToggle: () => void;
};

function SortDropdown({ isOpen }: SortDropdownProps) {
  const sort = useTicketSort();
  const { setSort } = useTicketUIActions();

  const handleSortChange = (field: SortState["field"]) => {
    setSort({
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
