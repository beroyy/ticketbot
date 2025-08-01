import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTicketActions } from "@/shared/stores/app-store";
import { useAuth } from "@/features/auth/auth-provider";
import { TicketDetailView } from "@/features/tickets/ui/ticket-detail-view";
import { ActiveFilters } from "@/features/tickets/ui/ticket-filters";
import { TicketsHeader } from "@/features/tickets/ui/tickets-header";
import { TicketsControls } from "@/features/tickets/ui/tickets-controls";
import { TicketsList } from "@/features/tickets/ui/tickets-list";
import { useTicketList } from "@/features/tickets/hooks/use-ticket-list";
import { TicketsPageLayout } from "@/features/tickets/layouts/tickets-page-layout";
import { SplitViewLayout } from "@/features/tickets/layouts/split-view-layout";

function TicketsContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Guild context
  const { selectedGuildId } = useAuth();

  // Use the ticket list hook
  const {
    tickets,
    selectedTicket,
    isLoading,
    error,
    filters,
    sort,
    searchQuery,
    selectedTicketId,
    activeTab,
  } = useTicketList(selectedGuildId);

  const { setSearch, setActiveTab, selectTicket } = useTicketActions();

  // TODO: Remove when we add collapsible functionality
  const isCollapsed = false;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-dropdown]")) {
        setIsFilterOpen(false);
        setIsSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <TicketsPageLayout>
      <SplitViewLayout
        isRightPanelOpen={!!selectedTicket}
        isLeftPanelCollapsed={isCollapsed}
        leftPanel={
          <>
            {/* Left Panel Header */}
            <div className="bg-white pb-6">
              <TicketsHeader isDetailView={!!selectedTicket} />
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value as "active" | "closed");
                }}
                className="w-full"
              >
                <div
                  className={`mb-4 flex items-center justify-between pt-1.5 ${
                    selectedTicket ? "mb-3" : ""
                  }`}
                >
                  <TabsList
                    className={`grid grid-cols-2 rounded-xl ${selectedTicket ? "w-full" : "w-1/3"}`}
                  >
                    <TabsTrigger className="tracking-subtle rounded-lg" value="active">
                      Active
                    </TabsTrigger>
                    <TabsTrigger className="tracking-subtle rounded-lg" value="closed">
                      Closed
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Search, Filter, Sort */}
                <TicketsControls
                  searchQuery={searchQuery}
                  onSearchChange={setSearch}
                  isFilterOpen={isFilterOpen}
                  onFilterToggle={() => {
                    setIsFilterOpen(!isFilterOpen);
                    setIsSortOpen(false);
                  }}
                  isSortOpen={isSortOpen}
                  onSortToggle={() => {
                    setIsSortOpen(!isSortOpen);
                    setIsFilterOpen(false);
                  }}
                  filters={filters}
                  sort={sort}
                  isCompact={!!selectedTicket}
                />
                <ActiveFilters />
              </Tabs>
            </div>

            {/* Ticket List Content */}
            <div className="flex-1 overflow-auto">
              <TicketsList
                tickets={tickets}
                selectedTicketId={selectedTicketId}
                onTicketSelect={selectTicket}
                isLoading={isLoading}
                error={error}
                activeTab={activeTab}
                isCompact={!!selectedTicket}
              />
            </div>
          </>
        }
        rightPanel={
          selectedTicket ? (
            <TicketDetailView ticket={selectedTicket} onClose={() => selectTicket(null)} />
          ) : undefined
        }
      />
    </TicketsPageLayout>
  );
}

export default function TicketsPage() {
  return <TicketsContent />;
}
