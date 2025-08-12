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
 * Get user's permissions in a guild
 */
export const getUserPermissions = async (
  userId: string,
  guildId: string
): Promise<bigint> => {
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

  // Combine all permissions using bitwise OR
  let combinedPermissions = 0n;
  for (const membership of memberships) {
    if (membership.guildRole.permissions) {
      combinedPermissions |= membership.guildRole.permissions;
    }
  }

  return combinedPermissions;
};

/**
 * Check if user has specific permission
 */
export const hasPermission = async (
  guildId: string,
  userId: string,
  permission: bigint
): Promise<boolean> => {
  const userPermissions = await getUserPermissions(userId, guildId);
  return (userPermissions & permission) === permission;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = async (
  guildId: string,
  userId: string,
  ...permissions: bigint[]
): Promise<boolean> => {
  if (permissions.length === 0) return false;
  
  const userPermissions = await getUserPermissions(userId, guildId);
  
  for (const permission of permissions) {
    if ((userPermissions & permission) === permission) {
      return true;
    }
  }
  
  return false;
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