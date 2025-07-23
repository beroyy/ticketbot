import { User } from "../../domains";
import { logger } from "../utils/logger";

/**
 * Links a Discord account to a Better Auth user
 * This ensures the Discord ID is properly stored and cached
 */
export async function linkDiscordAccount(
  betterAuthUserId: string,
  discordId: string,
  userData?: {
    username?: string;
    discriminator?: string | null;
    avatarUrl?: string | null;
  }
): Promise<void> {
  try {
    await User.linkDiscordAccount(betterAuthUserId, discordId, userData);
  } catch (error) {
    logger.error("Error linking Discord account:", error);
    throw new Error(
      `Failed to link Discord account: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Ensures a Discord account is linked for the current Better Auth user
 * Fetches the Discord account from the OAuth provider if not already linked
 */
export async function ensureDiscordLinked(betterAuthUserId: string): Promise<string | null> {
  try {
    // First check if already linked
    const user = await User.getBetterAuthUser(betterAuthUserId);

    if (user?.discordUserId) {
      return user.discordUserId;
    }

    // Check if there's a Discord OAuth account
    const { Account } = await import("@ticketsbot/core/domains");
    const discordAccount = await Account.getDiscordAccount(betterAuthUserId);

    if (!discordAccount?.accountId) {
      logger.debug(`No Discord account found for Better Auth user ${betterAuthUserId}`);
      return null;
    }

    // Link the Discord account
    await linkDiscordAccount(betterAuthUserId, discordAccount.accountId);

    return discordAccount.accountId;
  } catch (error) {
    logger.error("Error ensuring Discord link:", error);
    return null;
  }
}
