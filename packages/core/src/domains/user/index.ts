import { prisma } from "../../prisma/client";
import { Prisma, type DiscordUser } from "@prisma/client";

// Export specific schemas
export {
  UpsertDiscordUserSchema,
  BlacklistUserSchema,
  UnblacklistSchema,
  CheckBlacklistSchema,
  UserQuerySchema,
  UserStatsQuerySchema,
  type UpsertDiscordUser,
  type BlacklistUser,
  type Unblacklist,
  type CheckBlacklist,
  type UserQuery,
  type UserStatsQuery,
} from "./schemas";

export namespace User {
  // Re-export Prisma type for domain consumers
  export type Discord = DiscordUser;

  /**
   * Ensure a Discord user exists in the database, creating or updating as needed
   */
  export const ensure = async (
    discordId: string,
    username: string,
    discriminator?: string,
    avatarUrl?: string,
    metadata?: unknown
  ): Promise<DiscordUser> => {
    return prisma.discordUser.upsert({
      where: { id: discordId },
      update: {
        username,
        discriminator: discriminator ?? null,
        avatarUrl: avatarUrl ?? null,
        ...(metadata !== undefined && { metadata: metadata as Prisma.InputJsonValue }),
      },
      create: {
        id: discordId,
        username,
        discriminator: discriminator ?? null,
        avatarUrl: avatarUrl ?? null,
        metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  };

  /**
   * Check if a user is blacklisted in a guild
   */
  export const isBlacklisted = async (guildId: string, userId: string): Promise<boolean> => {
    const blacklistEntry = await prisma.blacklist.findFirst({
      where: {
        guildId: guildId,
        targetId: userId,
        isRole: false,
      },
    });

    return !!blacklistEntry;
  };

  /**
   * Get user permissions in a guild (convenience method that delegates to Role domain)
   */
  export const getPermissions = async (guildId: string, userId: string): Promise<bigint> => {
    // Import Role domain here to avoid circular dependency
    const { Role } = await import("../role");
    return Role.getUserPermissions(guildId, userId);
  };

  /**
   * Get a Discord user by ID
   */
  export const getDiscordUser = async (discordId: string): Promise<DiscordUser | null> => {
    return prisma.discordUser.findUnique({
      where: { id: discordId },
    });
  };

  /**
   * Link a Discord account to a Better Auth user
   * This ensures the Discord ID is properly stored and cached
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
    // Ensure Discord user exists with latest data
    await ensure(
      discordId,
      userData?.username || "Unknown",
      userData?.discriminator || undefined,
      userData?.avatarUrl || undefined,
      {
        betterAuthUserId,
        linkedAt: new Date().toISOString(),
      }
    );

    // Update Better Auth User record with Discord ID link
    await prisma.user.update({
      where: { id: betterAuthUserId },
      data: { discordUserId: discordId },
    });

    console.log(
      `Successfully linked Discord ID ${discordId} to Better Auth user ${betterAuthUserId}`
    );
  };

  /**
   * Get Better Auth user by ID with Discord data
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
   * Update Better Auth user's Discord ID
   */
  export const updateDiscordUserId = async (
    userId: string,
    discordUserId: string
  ): Promise<void> => {
    await prisma.user.update({
      where: { id: userId },
      data: { discordUserId },
    });
  };

  /**
   * Update Discord user's cached guilds
   */
  export const updateGuildsCache = async (
    discordId: string,
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
      where: { id: discordId },
      data: {
        guilds: {
          data: guilds,
          fetchedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  };
}
