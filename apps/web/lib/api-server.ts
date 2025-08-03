import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";
import type { IncomingMessage } from "http";
import { env } from "../env";

export function createServerApiClient(req: IncomingMessage) {
  const baseURL = env.server.API_URL || "http://localhost:4001";
  
  // Forward cookies from the request
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

export interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  connected: boolean;
  owner: boolean;
  setupRequired: boolean;
}

// Cached guild fetcher to avoid duplicate calls
export async function fetchUserGuilds(req: IncomingMessage): Promise<Guild[]> {
  const api = createServerApiClient(req);
  
  try {
    const response = await api.discord.guilds.$get();
    if (response.ok) {
      const data = await response.json();
      return data.guilds.map((g: any) => ({
        id: g.id,
        name: g.name,
        iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        connected: g.botInstalled,
        owner: g.owner,
        setupRequired: g.botInstalled && !g.botConfigured,
      }));
    }
    console.error("Failed to fetch guilds:", response.status);
    return [];
  } catch (error) {
    console.error("Failed to fetch guilds:", error);
    return [];
  }
}