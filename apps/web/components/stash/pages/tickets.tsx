import { useEffect, useState } from "react";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import { RiDeleteBackLine } from "react-icons/ri";
import { EmojiProgressIcon } from "@/components/emoji-progress-icon";
import { StatusBadge } from "@/components/status-badge";
import { useTicketsStore } from "@/lib/tickets-store";
import type { Ticket } from "@/lib/tickets-store";
import { useActiveTickets, useClosedTickets } from "@/lib/queries";
import { useSelectServer } from "@/components/select-server-provider";
import { TicketDetailView } from "@/components/ticket-detail-view";
import { FilterDropdown, SortDropdown, ActiveFilters } from "@/components/ticket-filters";
import { formatDate } from "@/lib/utils";
import { RiFilter3Line } from "react-icons/ri";
import { RiSortDesc } from "react-icons/ri";

function TicketCard({
  ticket,
  isSelected,
  onClick,
}: {
  ticket: Ticket;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className="cursor-pointer p-4 transition-all duration-200"
      style={{
        borderRadius: "16px",
        border: isSelected ? "1px solid #5C7DE5" : "1px solid #E1E4EA",
        background: isSelected ? "#FBFCFF" : "#FFF",
        boxShadow: isSelected
          ? "0px 4px 5px 0px rgba(10, 13, 20, 0.03)"
          : "0px 1px 2px 0px rgba(10, 13, 20, 0.03)",
      }}
      onClick={onClick}
    >
      {/* Header with ID, Date, and Assignee */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <EmojiProgressIcon percentage={ticket.progress} size={50} strokeWidth={4} />
          <div className="flex items-center space-x-2">
            <span className="text-lg text-[#525866]">
              ID <span className="tracking-wider">{ticket.id}</span>
            </span>
            <span className="text-sm text-gray-500">{formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <div className="size-6 overflow-hidden rounded-full">
            {ticket.openerImage || ticket.openerAvatar ? (
              <Image
                src={ticket.openerImage || ticket.openerAvatar || ""}
                alt={ticket.opener || "Ticket opener"}
                className="h-full w-full object-cover"
                width={32}
                height={32}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xs font-medium text-gray-600">
                {ticket.opener ? (ticket.opener[0]?.toUpperCase() ?? "?") : "?"}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-900">
            {(ticket.openerMetadata as { displayName?: string } | undefined)?.displayName ||
              ticket.opener ||
              "Unknown User"}
          </span>
        </div>
      </div>

      {/* Type and Status */}
      <div className="mb-4 flex items-center space-x-3.5">
        <div className="-ml-1.5 flex items-center space-x-0.5">
          <div className="flex size-10 items-center justify-center rounded">
            <RiDeleteBackLine
              className="size-6 rotate-180 transform text-[#3F40E3]"
              strokeWidth={0.2}
            />
          </div>
          <span className="text-xl font-bold text-gray-900">{ticket.type}</span>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      {/* Bottom Info Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="mb-1.5 text-sm text-gray-500">Urgency</div>
          <div className="font-medium text-gray-900">{ticket.urgency || "5/10"}</div>
        </div>
        <div>
          <div className="mb-1.5 text-sm text-gray-500">Awaiting Response</div>
          <div className="font-medium text-gray-900">{ticket.awaitingResponse}</div>
        </div>
        <div>
          <div className="mb-1.5 text-sm text-gray-500">Last Message</div>
          <div className="font-medium text-gray-900">{ticket.lastMessage}</div>
        </div>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const {
    searchQuery,
    activeTab,
    isLoading,
    error,
    selectedTicket,
    isCollapsed,
    filters,
    sort,
    setSearchQuery,
    setActiveTab,
    setTickets,
    setClosedTickets,
    setLoading,
    setError,
    setSelectedTicket,
    filteredActiveTickets,
    filteredClosedTickets,
  } = useTicketsStore();

  const { selectedGuildId } = useSelectServer();
  const activeTicketsQuery = useActiveTickets(selectedGuildId);
  const closedTicketsQuery = useClosedTickets(selectedGuildId);

  useEffect(() => {
    if (activeTicketsQuery.data) {
      setTickets(activeTicketsQuery.data);
    }
    if (closedTicketsQuery.data) {
      setClosedTickets(closedTicketsQuery.data);
    }
  }, [activeTicketsQuery.data, closedTicketsQuery.data, setTickets, setClosedTickets]);

  useEffect(() => {
    setLoading(activeTicketsQuery.isLoading || closedTicketsQuery.isLoading);
  }, [activeTicketsQuery.isLoading, closedTicketsQuery.isLoading, setLoading]);

  useEffect(() => {
    if (activeTicketsQuery.error || closedTicketsQuery.error) {
      setError("Failed to load tickets");
    } else {
      setError(null);
    }
  }, [activeTicketsQuery.error, closedTicketsQuery.error, setError]);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseDetail = () => {
    setSelectedTicket(null);
  };

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
    <div className="bg-background h-[94dvh] overflow-hidden">
      <div className={selectedTicket ? "flex h-screen px-10 py-6" : "p-10"}>
        {/* Left Panel - Ticket List */}
        <div
          className={
            selectedTicket
              ? isCollapsed
                ? "w-0 overflow-hidden"
                : "flex w-1/2 flex-col bg-white"
              : "w-full"
          }
        >
          {/* Left Panel Header */}
          <div className="bg-white pb-6">
            {!selectedTicket && (
              <div className="mb-4 border-b pb-4">
                <h1 className="mb-1 text-2xl font-semibold text-gray-900">Tickets</h1>
                <p className="text-base text-gray-500">
                  See all the ticket history, status, progress and chat
                </p>
              </div>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              <div className="space-y-3">
                <div className={`flex items-center ${selectedTicket ? "space-x-2" : "space-x-3"}`}>
                  {/* todo: remove pointer-events-none when search is ready to go */}
                  <div
                    className={`nice-gray-border pointer-events-none relative flex ${
                      selectedTicket ? "flex-1" : "w-full"
                    }`}
                  >
                    <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      placeholder="AI Search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      className="tracking-subtle border-0 bg-transparent pl-10 text-base shadow-none placeholder:text-[#99A0AE]"
                    />
                  </div>
                  <div
                    className={`relative flex ${selectedTicket ? "space-x-2" : "space-x-3"}`}
                    data-dropdown
                  >
                    <div className="relative flex-1">
                      <Button
                        variant="ghost"
                        className={`nice-gray-border flex w-full items-center justify-center space-x-1 text-base ${
                          selectedTicket ? "px-3" : "px-8"
                        }`}
                        onClick={() => {
                          setIsFilterOpen(!isFilterOpen);
                          setIsSortOpen(false);
                        }}
                      >
                        <RiFilter3Line className="size-5 text-[#525866]" strokeWidth={0.2} />
                        {!selectedTicket && (
                          <span className="tracking-subtle text-[#525866]">Filter</span>
                        )}
                        {(filters.status.length > 0 ||
                          filters.type.length > 0 ||
                          filters.assignee.length > 0 ||
                          filters.dateRange.from ||
                          filters.dateRange.to) && (
                          <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                            {filters.status.length +
                              filters.type.length +
                              filters.assignee.length +
                              (filters.dateRange.from || filters.dateRange.to ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                      <FilterDropdown
                        isOpen={isFilterOpen}
                        onToggle={() => {
                          setIsFilterOpen(!isFilterOpen);
                        }}
                      />
                    </div>
                    <div className="relative flex-1">
                      <Button
                        variant="ghost"
                        className={`nice-gray-border flex w-full items-center text-base ${
                          selectedTicket
                            ? "justify-center px-3"
                            : "justify-between space-x-0.5 px-3"
                        }`}
                        onClick={() => {
                          setIsSortOpen(!isSortOpen);
                          setIsFilterOpen(false);
                        }}
                      >
                        <RiSortDesc className="size-5 text-[#99A0AE]" strokeWidth={0.2} />
                        {!selectedTicket && (
                          <>
                            <span className="tracking-subtle text-[#525866]">Sort by</span>
                            {sort.field !== "createdAt" && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {sort.field}
                              </Badge>
                            )}
                            <ChevronDown
                              className="size-4 scale-y-110 text-[#99A0AE]"
                              strokeWidth={2.7}
                            />
                          </>
                        )}
                      </Button>
                      <SortDropdown
                        isOpen={isSortOpen}
                        onToggle={() => {
                          setIsSortOpen(!isSortOpen);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <ActiveFilters />
              </div>
            </Tabs>
          </div>

          {/* Ticket List Content */}
          <div className="flex-1 overflow-auto">
            {isLoading && (
              <div className="py-12 text-center">
                <div className="text-gray-500">Loading tickets...</div>
              </div>
            )}

            {error && (
              <div className="py-12 text-center">
                <div className="text-red-500">{error}</div>
              </div>
            )}

            {!isLoading && !error && (
              <div
                className={
                  selectedTicket
                    ? "space-y-3"
                    : "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
                }
              >
                {activeTab === "active"
                  ? filteredActiveTickets().map((ticket, index) => (
                      <TicketCard
                        key={`${ticket.id}-${index.toString()}`}
                        ticket={ticket}
                        isSelected={selectedTicket?.id === ticket.id}
                        onClick={() => {
                          handleTicketClick(ticket);
                        }}
                      />
                    ))
                  : filteredClosedTickets().map((ticket, index) => (
                      <TicketCard
                        key={`${ticket.id}-${index.toString()}`}
                        ticket={ticket}
                        isSelected={selectedTicket?.id === ticket.id}
                        onClick={() => {
                          handleTicketClick(ticket);
                        }}
                      />
                    ))}
              </div>
            )}

            {!isLoading &&
              !error &&
              (activeTab === "active"
                ? filteredActiveTickets().length === 0
                : filteredClosedTickets().length === 0) && (
                <div className="py-12 text-center">
                  <div className="text-gray-500">No {activeTab} tickets found</div>
                </div>
              )}
          </div>
        </div>

        {/* Right Panel - Ticket Detail */}
        {selectedTicket && <TicketDetailView ticket={selectedTicket} onClose={handleCloseDetail} />}
      </div>
    </div>
  );
}
