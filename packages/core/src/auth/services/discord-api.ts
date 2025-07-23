/**
 * Discord API helper for fetching user data
 */

import { logger } from "../utils/logger";

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null;
  accent_color?: number | null;
  locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      logger.error("Failed to fetch Discord user:", response.status, response.statusText);
      return null;
    }

    const userData = (await response.json()) as DiscordUser;
    return userData;
  } catch (error) {
    logger.error("Error fetching Discord user:", error);
    return null;
  }
}

/**
 * Get Discord avatar URL
 */
export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null,
  discriminator: string
): string {
  if (avatarHash) {
    const format = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}`;
  } else {
    // Default avatar based on discriminator (or user ID for new usernames)
    const defaultIndex =
      discriminator === "0" ? (BigInt(userId) >> 22n) % 6n : parseInt(discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex.toString()}.png`;
  }
}
