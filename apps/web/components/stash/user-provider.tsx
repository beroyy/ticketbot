"use client";

import { useEffect } from "react";
import { useSession } from "@ticketsbot/auth/client";
import { useUserStore } from "@/src/stores/user-store";
import { apiClient } from "@/lib/api";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const { setUserData, clearUserData } = useUserStore();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user) {
        clearUserData();
        return;
      }

      const user = session.user;

      // Set basic user data first
      setUserData({
        betterAuthId: user.id,
        username: user.name,
        email: user.email,
        avatarUrl: user.image || null,
      });

      // If Discord ID is already in the session, use it
      const userWithDiscordId = user as { discordUserId?: string | null };
      if (userWithDiscordId.discordUserId) {
        setUserData({ discordId: userWithDiscordId.discordUserId });
      } else {
        // Otherwise, fetch it from the API
        try {
          const response = await apiClient.get<{ user: { discordUserId: string | null } }>(
            "/api/auth/me"
          );
          if (response.user.discordUserId) {
            setUserData({ discordId: response.user.discordUserId.toString() });
          }
        } catch (error) {
          console.error("Failed to fetch user Discord ID:", error);
        }
      }
    };

    if (!isPending) {
      void fetchUserData();
    }
  }, [session, isPending, setUserData, clearUserData]);

  return <>{children}</>;
}
