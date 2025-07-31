import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useTicketStats,
  useRecentActivity,
  type RecentActivityEntry,
} from "@/features/tickets/queries";
import { useState, useEffect } from "react";
import { RiTicketLine, RiUser3Line } from "react-icons/ri";
import { ArrowUpRight, ArrowDownRight, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuildData } from "@/features/user/hooks/use-guild-data";

export default function Home() {
  const { selectedGuildId } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1D" | "1W" | "1M" | "3M">("1M");
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Refresh guild data on initial load to ensure bot status is current
  const { refetch: refetchGuilds } = useGuildData({ refresh: !hasInitialLoad });
  
  useEffect(() => {
    if (!hasInitialLoad && selectedGuildId) {
      setHasInitialLoad(true);
      // Also trigger a refresh to ensure we have the latest data
      refetchGuilds();
    }
  }, [hasInitialLoad, selectedGuildId, refetchGuilds]);

  const { data: ticketStats, isLoading, error } = useTicketStats(selectedGuildId);

  const {
    data: recentActivity,
    isLoading: isActivityLoading,
    error: activityError,
  } = useRecentActivity(selectedGuildId, 8);

  // Extract data for the selected timeframe
  const timeframeData = (ticketStats as any)?.timeframes?.[selectedTimeframe];
  const chartData = timeframeData?.chartData || [];
  const currentPeriodTickets = timeframeData?.currentPeriod?.totalTickets || 0;
  const activeTickets = (ticketStats as any)?.totals?.activeTickets || ticketStats?.openTickets || 0;
  const percentageChange = timeframeData?.percentageChange || 0;
  const isPositive = timeframeData?.isPositive ?? true;

  if (isLoading || isActivityLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading dashboard...</div>
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
    <div className="min-h-screen bg-white px-8">
      <div className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
          {/* Left Column - Overview */}
          <div className="lg:col-span-2">
            <div className="p-6">
              <h2 className="mb-2 text-3xl font-semibold text-gray-900">Overview</h2>
              <p className="mb-8 text-sm text-gray-600">
                Monitor your Discord server&apos;s ticket activity and support team performance.
              </p>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Tickets created card (spans 2 rows) */}
                <div className="nice-gray-border row-span-2 rounded-2xl p-4">
                  <div className="mb-8 flex items-center gap-2">
                    <RiTicketLine className="h-6 w-6 text-[#3F40E3]" />
                    <span className="text-xl font-medium text-gray-800">Tickets Created</span>
                  </div>

                  {/* Tabs - full width */}
                  <div className="mb-6 flex overflow-hidden rounded-lg border border-gray-200 bg-white">
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

                  {/* Count and percentage */}
                  <div className="mb-8 flex items-center gap-3">
                    <div className="text-3xl font-bold text-gray-900">{currentPeriodTickets}</div>
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
                  </div>

                  {/* Chart inside the card */}
                  <div className="h-64">
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
                  </div>
                </div>

                {/* Right Column Top - Members Count card */}
                <div className="nice-gray-border flex flex-col justify-between rounded-2xl p-4">
                  <div className="">
                    <div className="flex items-center justify-between">
                      <div className="mb-4 flex items-center gap-2">
                        <RiUser3Line className="h-6 w-6 text-[#3F40E3]" />
                        <span className="text-xl font-medium text-gray-800">Members Count</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">286K</div>
                  </div>

                  <Button variant="outline" className="w-full rounded-xl">
                    View all <ChevronRight className="size-4" />
                  </Button>
                </div>

                {/* Right Column Bottom - Active Tickets card */}
                <div className="nice-gray-border flex flex-col justify-between rounded-2xl p-4">
                  <div className="gap-1">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="outline-3 size-3 rounded-full bg-green-400 outline outline-green-100"></div>
                      <span className="text-xl font-medium text-gray-800">Active Tickets</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{activeTickets}</div>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl">
                    View all <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Member Activity Log */}
          <div className="nice-gray-border flex h-[600px] flex-col rounded-2xl px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Member Activity Log</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
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
                <div className="flex h-32 items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-sm">No recent activity</div>
                    <div className="mt-1 text-xs">
                      Activity will appear here as tickets are created and managed
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
// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
