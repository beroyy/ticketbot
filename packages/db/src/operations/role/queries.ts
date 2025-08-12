import { prisma } from "../../client";
import { GuildRoleStatus } from "../..";

/**
 * Get all active roles for a guild
 */
export const getRoles = async (guildId: string): Promise<any[]> => {
  return prisma.guildRole.findMany({
    where: {
      guildId,
      status: GuildRoleStatus.ACTIVE,
    },
    orderBy: {
      position: "asc",
    },
  });
};

/**
 * Get a role by name
 */
export const getRoleByName = async (
  guildId: string,
  name: string
): Promise<any | null> => {
  return prisma.guildRole.findFirst({
    where: {
      guildId,
      name: name.toLowerCase(),
      status: GuildRoleStatus.ACTIVE,
    },
  });
};

/**
 * Get all roles for a user in a guild
 */
export const getUserRoles = async (
  guildId: string,
  userId: string
): Promise<any[]> => {
  const memberships = await prisma.guildRoleMember.findMany({
    where: {
      discordId: userId,
      guildRole: {
        guildId,
        status: GuildRoleStatus.ACTIVE,
      },
    },
    include: {
      guildRole: true,
    },
  });

  return memberships.map((m) => m.guildRole);
};

/**
 * Get all members of a role
 */
export const getRoleMembers = async (roleId: number): Promise<any[]> => {
  const memberships = await prisma.guildRoleMember.findMany({
    where: {
      guildRoleId: roleId,
    },
    include: {
      discordUser: true,
    },
  });

  return memberships.map((m) => m.discordUser);
};

/**
 * Get all active members with details
 */
export const getActiveMembersWithDetails = async (guildId: string) => {
  return prisma.guildRoleMember.findMany({
    where: {
      guildRole: {
        guildId,
        status: GuildRoleStatus.ACTIVE,
      },
    },
    include: {
      guildRole: true,
      discordUser: true,
    },
    distinct: ["discordId"],
  });
};

/**
 * Alias for getActiveMembersWithDetails
 */
export const getActiveMembers = getActiveMembersWithDetails;

/**
 * Get all active members for a role (legacy function kept for compatibility)
 */
export async function getActiveMembersForRole(guildId: string) {
  return prisma.guildRoleMember.findMany({
    where: {
      guildRole: {
        guildId,
        status: GuildRoleStatus.ACTIVE,
      },
    },
    include: {
      guildRole: true,
      discordUser: true,
    },
    distinct: ["discordId"],
  });
}