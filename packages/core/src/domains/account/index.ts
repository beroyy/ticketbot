import { prisma, type Account as PrismaAccount } from "@ticketsbot/db";

export namespace Account {
  export type Account = PrismaAccount;

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

  export const findByUserId = async (userId: string): Promise<PrismaAccount[]> => {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  };

  export const getDiscordAccount = async (userId: string): Promise<PrismaAccount | null> => {
    return findByUserAndProvider(userId, "discord");
  };

  export const hasProvider = async (userId: string, providerId: string): Promise<boolean> => {
    const account = await findByUserAndProvider(userId, providerId);
    return !!account;
  };

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
