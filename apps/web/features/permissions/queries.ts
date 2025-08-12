import { api } from "@/lib/api";
import type { UserRole } from "./types";

async function fetchUserRole(guildId: string): Promise<UserRole> {
  const res = await api.permissions[":guildId"].$get({
    param: { guildId },
  });
  if (!res.ok) throw new Error("Failed to fetch user role");
  const data = await res.json();

  return {
    guildId,
    role: data.role,
    userId: data.userId,
  };
}

export const permissionQueries = {
  get: (guildId: string | null | undefined) => ({
    queryKey: ["permissions", "user", guildId],
    queryFn: () => fetchUserRole(guildId!),
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),
};