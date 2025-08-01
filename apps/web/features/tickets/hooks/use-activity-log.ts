import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import type { ActivityLogEntry } from "@/features/tickets/types";

export function useActivityLog(ticketId: string) {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedGuildId } = useAuth();

  const fetchActivityLog = useCallback(async () => {
    if (!ticketId || !selectedGuildId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.tickets[":id"].activity.$get({
        param: { id: encodeURIComponent(ticketId) },
        query: { guildId: selectedGuildId },
      });
      
      if (!res.ok) throw new Error("Failed to fetch activity log");
      
      const data = await res.json();
      setActivityLog(data);
    } catch (err) {
      setError("Failed to load activity log");
      console.error("Error fetching activity log:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, selectedGuildId]);

  useEffect(() => {
    void fetchActivityLog();
  }, [fetchActivityLog]);

  return { 
    activityLog, 
    isLoading, 
    error,
    refetch: fetchActivityLog
  };
}