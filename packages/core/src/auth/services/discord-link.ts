import { User } from "@ticketsbot/core/domains/user";
import { logger } from "../utils/logger";

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

export async function ensureDiscordLinked(betterAuthUserId: string): Promise<string | null> {
  try {
    const user = await User.getBetterAuthUser(betterAuthUserId);

    if (user?.discordUserId) {
      return user.discordUserId;
    }

    const { Account } = await import("@ticketsbot/core/domains/account");
    const discordAccount = await Account.getDiscordAccount(betterAuthUserId);

    if (!discordAccount?.accountId) {
      logger.debug(`No Discord account found for Better Auth user ${betterAuthUserId}`);
      return null;
    }

    await linkDiscordAccount(betterAuthUserId, discordAccount.accountId);

    return discordAccount.accountId;
  } catch (error) {
    logger.error("Error ensuring Discord link:", error);
    return null;
  }
}
