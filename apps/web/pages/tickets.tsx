import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTicketUIActions, useTicketCollapsed } from "@/features/tickets/stores/tickets-ui-store";
import { TicketDetailView } from "@/features/tickets/ui/ticket-detail-view";
import { ActiveFilters } from "@/features/tickets/ui/active-filters";
import { TicketsControls } from "@/features/tickets/ui/tickets-controls";
import { TicketsList } from "@/features/tickets/ui/tickets-list";
import { useTicketList } from "@/features/tickets/hooks/use-ticket-list";
import { TicketsLayout } from "@/features/tickets/ui/tickets-layout";
import { withGuildRoute } from "@/lib/with-auth";
import { createServerApiClient } from "@/lib/api-server";
import type { InferGetServerSidePropsType } from "next";

export const getServerSideProps = withGuildRoute(async (context, _session, guildId, _guilds) => {
  const api = createServerApiClient(context.req);

  try {
    // Fetch initial tickets data
    const response = await api.tickets.$get({
      query: {
        guildId,
        status: "active",
        page: "1",
        pageSize: "50",
      },
    });

    if (response.ok) {
      const tickets = (await response.json()) as any[];
      return {
        props: {
          initialTickets: tickets || [],
          totalCount: tickets?.length || 0,
        },
      };
    }
  } catch (error) {
    console.error("Failed to fetch initial tickets:", error);
  }

  return {
    props: {
      initialTickets: [],
      totalCount: 0,
    },
  };
});

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function TicketsPage({ selectedGuildId }: PageProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

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
  } = useTicketList(selectedGuildId!);

  const { setSearchQuery, setActiveTab, setSelectedTicketId, setCollapsed } = useTicketUIActions();
  const isCollapsed = useTicketCollapsed();

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
    <TicketsLayout
      isRightPanelOpen={!!selectedTicket}
      isLeftPanelCollapsed={isCollapsed}
      rightPanel={
        selectedTicket ? (
          <TicketDetailView
            ticket={selectedTicket}
            onClose={() => setSelectedTicketId(null)}
            onCollapseToggle={() => setCollapsed(!isCollapsed)}
          />
        ) : undefined
      }
      leftPanel={
        <>
          <div className="bg-white pb-6">
            {!selectedTicket && (
              <div className="mb-4 border-b pb-4">
                <h1 className="mb-1 text-2xl font-semibold text-gray-900">Tickets</h1>
                <p className="text-base text-gray-500">
                  See all the ticket history, status, progress and chat
                </p>
              </div>
            )}
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

              <TicketsControls
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
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

          <div className="flex-1 overflow-auto">
            <TicketsList
              tickets={tickets}
              selectedTicketId={selectedTicketId}
              onTicketSelect={setSelectedTicketId}
              isLoading={isLoading}
              error={error}
              activeTab={activeTab}
              isCompact={!!selectedTicket}
            />
          </div>
        </>
      }
    />
  );
}
