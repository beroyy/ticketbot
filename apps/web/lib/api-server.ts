import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";
import type { IncomingMessage } from "http";
import { env } from "../env";
import { getServerSession } from "./server-auth";
import { createHmacHeaders, type HmacPayload } from "./hmac";
import { User } from "@ticketsbot/core/domains/user";

/**
 * Create server API client with HMAC authentication
 * For use in getServerSideProps - automatically adds HMAC headers
 */
export async function createServerApiClient(
  req: IncomingMessage,
  guildId?: string
): Promise<ReturnType<typeof hc<AppType>>> {
  const baseURL = env.API_URL || env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Get session for HMAC
  const session = await getServerSession(req);
  
  if (!session) {
    // No session, return client without auth
    return hc<AppType>(baseURL, {
      init: {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    });
  }

  // Calculate permissions if guild is provided
  let permissions = "0";
  if (guildId && session.user.discordUserId) {
    try {
      const perms = await User.getPermissions(guildId, session.user.discordUserId);
      permissions = perms.toString();
    } catch {
      // Ignore permission calculation errors
    }
  }

  // Create HMAC payload
  const payload: HmacPayload = {
    userId: session.user.id,
    email: session.user.email,
    discordUserId: session.user.discordUserId,
    selectedGuildId: guildId,
    permissions,
    sessionId: session.session.id,
    expiresAt: session.session.expiresAt,
    timestamp: Date.now(),
    // Add additional fields that might be needed
    username: session.user.username,
    discriminator: session.user.discriminator,
    avatar_url: session.user.avatar_url,
    name: session.user.name,
  } as HmacPayload & { 
    username?: string | null;
    discriminator?: string | null;
    avatar_url?: string | null;
    name?: string;
  };

  const hmacHeaders = createHmacHeaders(payload);

  return hc<AppType>(baseURL, {
    init: {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...hmacHeaders,
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
  const api = await createServerApiClient(req);

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
    return [];
  } catch {
    return [];
  }
}
