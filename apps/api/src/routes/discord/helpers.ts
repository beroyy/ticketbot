import { createLogger } from "../../lib/utils/logger";
import { getDiscordAccount as _getDiscordAccount } from "@ticketsbot/auth";
import { prisma, type Prisma } from "@ticketsbot/db";
import { ApiErrors } from "../../utils/error-handler";

const logger = createLogger("api:discord");

export const MANAGE_GUILD_PERMISSION = BigInt(0x20);
const DISCORD_API_BASE = "https://discord.com/api/v10";
const USER_AGENT = "ticketsbot.ai (https://github.com/yourusername/ticketsbot-ai, 1.0.0)";

export const getDiscordAccount = async (userId: string) => {
  const account = await _getDiscordAccount(userId);

  if (!account?.accessToken) {
    return { error: "Discord account not connected", code: "DISCORD_NOT_CONNECTED" };
  }

  if (account.accessTokenExpiresAt && account.accessTokenExpiresAt < new Date()) {
    return {
      error: "Discord token expired, please re-authenticate",
      code: "DISCORD_TOKEN_EXPIRED",
    };
  }

  return { account };
};

export const fetchDiscordAPI = async (path: string, accessToken: string) => {
  logger.debug("Making Discord API request", {
    path,
    hasToken: !!accessToken,
  });

  try {
    const response = await fetch(`${DISCORD_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": USER_AGENT,
      },
    });

    logger.debug("Discord API response", {
      path,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Discord API request failed", {
        path,
        status: response.status,
        statusText: response.statusText,
        errorBody,
      });

      if (response.status === 401) {
        return {
          error: "Discord token invalid, please re-authenticate",
          code: "DISCORD_TOKEN_INVALID",
        };
      }
      if (response.status === 404) {
        throw ApiErrors.notFound("Resource");
      }
      throw new Error(`Discord API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    logger.debug("Discord API request successful", {
      path,
      dataLength: Array.isArray(data) ? data.length : 1,
    });

    return { data };
  } catch (error) {
    logger.error("Discord API request exception", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Update the cached Discord guilds for a user
 * This caches the user's guild list to avoid repeated Discord API calls
 */
export const updateUserGuildsCache = async (
  discordUserId: string,
  guilds: Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
    isAdmin: boolean;
  }>
): Promise<void> => {
  await prisma.discordUser.update({
    where: { id: discordUserId },
    data: {
      guilds: {
        data: guilds,
        fetchedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
};
