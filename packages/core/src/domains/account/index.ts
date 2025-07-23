import { prisma } from "../../prisma/client";
import type { Account as PrismaAccount } from "@prisma/client";

/**
 * Account domain for Better Auth account operations
 * Handles OAuth accounts and their relationships with users
 */
export namespace Account {
  // Re-export Prisma type for domain consumers
  export type Account = PrismaAccount;

  /**
   * Find an account by user ID and provider
   */
  export const findByUserAndProvider = async (
    userId: string,
    providerId: string
  ): Promise<PrismaAccount | null> => {
    return prisma.account.findFirst({
      where: {
        userId,
        providerId,
      },
    });
  };

  /**
   * Find all accounts for a user
   */
  export const findByUserId = async (userId: string): Promise<PrismaAccount[]> => {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  };

  /**
   * Get Discord account for a user
   */
  export const getDiscordAccount = async (userId: string): Promise<PrismaAccount | null> => {
    return findByUserAndProvider(userId, "discord");
  };

  /**
   * Check if a user has a specific provider connected
   */
  export const hasProvider = async (userId: string, providerId: string): Promise<boolean> => {
    const account = await findByUserAndProvider(userId, providerId);
    return !!account;
  };

  /**
   * Get account by provider account ID
   */
  export const findByProviderAccountId = async (
    providerId: string,
    accountId: string
  ): Promise<PrismaAccount | null> => {
    return prisma.account.findFirst({
      where: {
        providerId,
        accountId,
      },
    });
  };
}
