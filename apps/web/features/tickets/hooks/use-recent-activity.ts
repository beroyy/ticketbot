import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { activityQueries } from "../queries/activity-queries";
import type { RecentActivityEntry } from "../queries/activity-queries";

export function useRecentActivity(
  guildId: string | null,
  limit: number = 10
): UseQueryResult<RecentActivityEntry[], Error> {
  return useQuery(activityQueries.recent(guildId, limit));
}
