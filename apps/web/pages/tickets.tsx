import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTicketsStore } from "@/features/tickets/tickets-store";
import { TicketDetailView } from "@/features/tickets/ui/ticket-detail-view";
import { ActiveFilters } from "@/features/tickets/ui/active-filters";
import { TicketsControls } from "@/features/tickets/ui/tickets-controls";
import { TicketsList } from "@/features/tickets/ui/tickets-list";
import { TicketsLayout } from "@/features/tickets/ui/tickets-layout";
import { withGuildRoute } from "@/lib/with-auth";
import { createServerApiClient } from "@/lib/api-server";
import { useQuery } from "@tanstack/react-query";
import type { InferGetServerSidePropsType } from "next";

export const getServerSideProps = withGuildRoute(async (context, _session, guildId, _guilds) => {
  const api = await createServerApiClient(context.req, guildId);

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

export default function TicketsPage({ selectedGuildId, initialTickets }: PageProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  const [isCollapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filters = useTicketsStore((s) => s.filters);
  const selectedTicketId = useTicketsStore((s) => s.selectedTicketId);
  const selectTicket = useTicketsStore((s) => s.selectTicket);

  // Fetch tickets directly
  const {
    data: tickets = initialTickets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tickets", selectedGuildId, filters, activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/tickets?guildId=${selectedGuildId}&status=${activeTab}`);
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
    enabled: !!selectedGuildId,
    initialData: initialTickets,
  });

  const selectedTicket = tickets?.find((t: any) => t.id === selectedTicketId);

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
            onClose={() => selectTicket(null)}
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
                filters={filters as any}
                sort={{ field: "createdAt" }}
                isCompact={!!selectedTicket}
              />
              <ActiveFilters />
            </Tabs>
          </div>

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
    />
  );
}
