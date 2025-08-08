import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useTicketStats } from "@/features/tickets/hooks/use-ticket-stats";
import { useRecentActivity } from "@/features/tickets/hooks/use-recent-activity";
import type { RecentActivityEntry } from "@/features/tickets/queries/activity-queries";
import { useState } from "react";
import { RiTicketLine, RiUser3Line } from "react-icons/ri";
import { ArrowUpRight, ArrowDownRight, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withGuildRoute } from "@/lib/with-auth";
import { createServerApiClient } from "@/lib/api-server";
import type { InferGetServerSidePropsType } from "next";
import { User } from "@ticketsbot/core/domains/user";
import { PermissionFlags } from "@ticketsbot/core";

export const getServerSideProps = withGuildRoute(async (context, session, guildId, _guilds) => {
  const api = createServerApiClient(context.req);
  let hasAnalyticsPermission = false;
  let initialTicketStats: any = null;
  let initialRecentActivity: any[] = [];

  try {
    // Check permissions first
    if (session.user.discordUserId) {
      const permissions = await User.getPermissions(guildId, session.user.discordUserId);
      hasAnalyticsPermission =
        (permissions & PermissionFlags.ANALYTICS_VIEW) === PermissionFlags.ANALYTICS_VIEW;
    }

    if (hasAnalyticsPermission) {
      // Fetch ticket stats
      const statsResponse = await api.tickets.statistics[":guildId"].$get({
        param: { guildId },
      });

      if (statsResponse.ok) {
        initialTicketStats = await statsResponse.json();
      }

      // Fetch recent activity - using ticket list endpoint for now
      const ticketsResponse = await api.tickets.$get({
        query: { guildId, page: "1", pageSize: "8", status: "all" },
      });

      if (ticketsResponse.ok) {
        const tickets = (await ticketsResponse.json()) as any[];
        // Transform tickets into activity format
        initialRecentActivity = (tickets || []).slice(0, 8).map((ticket: any) => ({
          id: ticket.id,
          event: `Ticket #${ticket.id} - ${ticket.status}`,
          timestamp: new Date(ticket.createdAt).toLocaleString(),
        }));
      }
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
  }

  return {
    props: {
      hasAnalyticsPermission,
      initialTicketStats,
      initialRecentActivity,
    },
  };
});

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function Dashboard({
  selectedGuildId,
  hasAnalyticsPermission,
  initialTicketStats,
  initialRecentActivity,
}: PageProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1D" | "1W" | "1M" | "3M">("1M");

  const { data: ticketStats = initialTicketStats, error } = useTicketStats(
    hasAnalyticsPermission ? selectedGuildId : null
  );

  const { data: recentActivity = initialRecentActivity, error: activityError } = useRecentActivity(
    hasAnalyticsPermission ? selectedGuildId : null,
    8
  );

  const timeframeData = (ticketStats as any)?.timeframes?.[selectedTimeframe];
  const chartData = timeframeData?.chartData || [];
  const currentPeriodTickets = timeframeData?.currentPeriod?.totalTickets || 0;
  const activeTickets =
    (ticketStats as any)?.totals?.activeTickets || ticketStats?.openTickets || 0;
  const percentageChange = timeframeData?.percentageChange || 0;
  const isPositive = timeframeData?.isPositive ?? true;

  if (!hasAnalyticsPermission) {
    return (
      <div className="w-2xl mx-auto flex min-h-screen items-center justify-center">
        <div className="w-full text-center">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">Limited Access</h2>
          <p className="mb-6 text-gray-600">
            You don't have permission to view analytics for this server. Please contact a server
            administrator to grant you the necessary permissions.
          </p>
          <Button onClick={() => (window.location.href = "/tickets")} variant="default">
            View Tickets Instead
          </Button>
        </div>
      </div>
    );
  }

  if (error || activityError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-red-600">Error loading dashboard data</div>
      </div>
    );
  }

  return (
    <div className="size-full bg-white px-8">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="px-6 pt-4">
              <h2 className="text-strong-blue mb-1.5 text-[22px] font-medium tracking-tight">
                Overview
              </h2>
              <p className="text-sub-gray mb-7 text-sm">
                Monitor your Discord server&apos;s ticket activity and support team performance.
              </p>

              <div className="grid grid-cols-2 gap-5">
                <div className="nice-gray-border row-span-2 rounded-2xl p-4">
                  <div className="mb-6 flex items-center gap-3">
                    <RiTicketLine className="text-bold-blue size-5" />
                    <span className="text-strong-black font-medium tracking-tight">
                      Tickets Created
                    </span>
                  </div>

                  <div className="mb-4 flex overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {(["1D", "1W", "1M", "3M"] as const).map((timeframe) => (
                      <button
                        key={timeframe}
                        onClick={() => {
                          setSelectedTimeframe(timeframe);
                        }}
                        className={`flex-1 border-r border-gray-200 px-3 py-1.5 text-xs font-medium last:border-r-0 ${
                          selectedTimeframe === timeframe
                            ? "bg-[#F5F7FA] text-gray-900"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {timeframe}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-gray-900">{currentPeriodTickets}</div>
                    {currentPeriodTickets !== 0 && (
                      <div
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium ${
                          isPositive ? "bg-[#E0FAEC] text-[#1FC16B]" : "bg-[#FFEAEA] text-[#E53E3E]"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {isPositive ? "+" : ""}
                        {String(percentageChange)}%
                      </div>
                    )}
                  </div>

                  <div className="h-64">
                    {currentPeriodTickets === 0 ? (
                      <div className="flex h-[65%] flex-col items-center justify-center text-center">
                        <div className="text-sub-gray text-sm">No data available</div>
                        <div className="text-sub-gray mt-1 text-xs">
                          Trends will appear here once tickets are created
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          // margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        >
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "#9CA3AF", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value: string | number | Date) => {
                              const date = new Date(value);
                              if (selectedTimeframe === "1D") {
                                // For 1 day view, show hour
                                return date.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  hour12: true,
                                });
                              } else if (selectedTimeframe === "3M") {
                                // For 3 month view, show month and day for weekly periods
                                return date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                });
                              } else {
                                // For other views, show month and day
                                return date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                });
                              }
                            }}
                          />
                          <YAxis
                            width={20}
                            tick={{ fill: "#9CA3AF", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, "dataMax + 1"]}
                          />
                          <Tooltip
                            content={({ active = false, payload, label }) => {
                              if (active && payload && payload.length) {
                                const date = new Date(String(label));
                                let formattedDate: string;

                                if (selectedTimeframe === "1D") {
                                  // For hourly view, show date and time
                                  formattedDate = date.toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  });
                                } else if (selectedTimeframe === "3M") {
                                  // For weekly periods, show date range
                                  const endDate = new Date(date);
                                  endDate.setDate(endDate.getDate() + 6);
                                  formattedDate = `${date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })} - ${endDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}`;
                                } else {
                                  formattedDate = date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  });
                                }

                                return (
                                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                                    <p className="text-sm font-medium text-gray-900">
                                      {formattedDate}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Tickets: {String(payload[0]?.value ?? 0)}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="tickets"
                            stroke="#335CFF"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{
                              r: 4,
                              stroke: "#3B82F6",
                              strokeWidth: 1,
                              fill: "#3B82F6",
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="nice-gray-border flex flex-col justify-between rounded-2xl p-4">
                  <div className="gap-1">
                    <div className="flex items-center justify-between">
                      <div className="mb-4 flex items-center gap-1.5">
                        <RiUser3Line className="text-bold-blue size-5" />
                        <span className="text-sub-gray tracking-tight">Members Count</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">286K</div>
                  </div>

                  <Button
                    variant="outline"
                    className="text-sub-gray w-full rounded-xl font-medium tracking-tight"
                  >
                    View All <ChevronRight className="size-4" />
                  </Button>
                </div>

                <div className="nice-gray-border flex flex-col justify-between rounded-2xl p-4">
                  <div className="gap-1">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="bg-bold-green outline-light-green mx-1 size-2 rounded-full outline-4"></div>
                      <span className="text-sub-gray tracking-tight">Active Tickets</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{activeTickets}</div>
                  </div>
                  <Button
                    variant="outline"
                    className="text-sub-gray w-full rounded-xl font-medium tracking-tight"
                  >
                    View All <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="nice-gray-border flex flex-col rounded-2xl px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-strong-blue font-medium tracking-tight">Member Activity Log</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>

            <div className="custom-scrollbar scrollbar-reserve flex-1 space-y-4 overflow-y-auto pr-2">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity: RecentActivityEntry, index: number) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-3 pl-1 ${
                      index < (recentActivity.length || 0) - 1
                        ? "border-b border-gray-200 pb-4"
                        : "pb-2"
                    }`}
                  >
                    <div className="mt-1 size-2 rounded-full bg-[#3F40E3]"></div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="size-3" />
                        {activity.timestamp}
                      </div>
                      <div className="text-sm font-medium text-gray-900">{activity.event}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-1.5 h-6 px-2 text-xs text-gray-700"
                    >
                      View Details <ChevronRight className="size-4" strokeWidth={2.5} />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex h-[65%] items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-sm">No recent activity</div>
                    <div className="mt-1 text-xs">
                      Activity will appear here once you start managing tickets
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
