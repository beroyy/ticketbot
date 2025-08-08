import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";
import type { IncomingMessage } from "http";
import { env } from "../env";

export function createServerApiClient(req: IncomingMessage) {
  const baseURL = env.API_URL || env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const cookie = req.headers.cookie || "";

  return hc<AppType>(baseURL, {
    init: {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
      },
    },
  });
}

export type Guild = {
  id: string;
  name: string;
  iconUrl: string | null;
  connected: boolean;
  owner: boolean;
  setupRequired: boolean;
};

export async function fetchUserGuilds(req: IncomingMessage): Promise<Guild[]> {
  const api = createServerApiClient(req);

  try {
    console.log("Fetching user guilds from API...");
    const response = await api.discord.guilds.$get();
    if (response.ok) {
      const data = await response.json();
      console.log(`Successfully fetched ${data.guilds?.length || 0} guilds`);
      return data.guilds.map((g: any) => ({
        id: g.id,
        name: g.name,
        iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        connected: g.botInstalled,
        owner: g.owner,
        setupRequired: g.botInstalled && !g.botConfigured,
      }));
    }
    console.error("Failed to fetch guilds - status:", response.status);
    return [];
  } catch (error) {
    console.error("Failed to fetch guilds - error:", error);
    return [];
  }
}
