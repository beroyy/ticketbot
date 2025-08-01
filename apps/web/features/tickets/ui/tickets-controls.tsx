import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown } from "lucide-react";
import { RiFilter3Line, RiSortDesc } from "react-icons/ri";
import { FilterDropdown, SortDropdown } from "@/features/tickets/ui/ticket-filters";

interface TicketsControlsProps {
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
}

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
        <div
          className={`relative flex ${isCompact ? "space-x-2" : "space-x-3"}`}
          data-dropdown
        >
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