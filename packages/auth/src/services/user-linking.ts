import { prisma } from "@ticketsbot/db";
import { logger } from "../utils/logger";
import { db } from "@ticketsbot/db";

/**
 * Auth-specific user operations for linking BetterAuth users with Discord accounts
 */

/**
 * Get the Discord OAuth account for a BetterAuth user
 */
export const getDiscordAccount = async (userId: string) => {
  return prisma.account.findFirst({
    where: {
      userId,
      providerId: "discord",
    },
  });
};

/**
 * Link a Discord account to a BetterAuth user
 */
export const linkDiscordAccount = async (
  betterAuthUserId: string,
  discordId: string,
  userData?: {
    username?: string;
    discriminator?: string | null;
    avatarUrl?: string | null;
  }
): Promise<void> => {
  // Ensure the Discord user exists
  await db.discordUser.ensureDiscordUser(
    discordId,
    userData?.username || "Unknown",
    userData?.discriminator || undefined,
    userData?.avatarUrl || undefined,
    {
      betterAuthUserId,
      linkedAt: new Date().toISOString(),
    }
  );

  // Link the Discord ID to the BetterAuth user
  await prisma.user.update({
    where: { id: betterAuthUserId },
    data: { discordUserId: discordId },
  });

  logger.info(`Linked Discord ID ${discordId} to Better Auth user ${betterAuthUserId}`);
};

/**
 * Get a BetterAuth user with their Discord information
 */
export const getBetterAuthUser = async (
  userId: string
): Promise<{
  id: string;
  discordUserId: string | null;
  username: string | null;
  discriminator: string | null;
  avatar_url: string | null;
} | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      discordUserId: true,
      discordUser: {
        select: {
          username: true,
          discriminator: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    discordUserId: user.discordUserId,
    username: user.discordUser?.username ?? null,
    discriminator: user.discordUser?.discriminator ?? null,
    avatar_url: user.discordUser?.avatarUrl ?? null,
  };
};

/**
 * Update a BetterAuth user's Discord ID
 */
export const updateDiscordUserId = async (userId: string, discordUserId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { discordUserId },
  });
};

/**
 * Ensure a Discord account is linked to a BetterAuth user
 */
export async function ensureDiscordLinked(betterAuthUserId: string): Promise<string | null> {
  try {
    const user = await getBetterAuthUser(betterAuthUserId);

    if (user?.discordUserId) {
      return user.discordUserId;
    }

    const discordAccount = await getDiscordAccount(betterAuthUserId);

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
