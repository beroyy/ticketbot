import { prisma } from "../client";
import { GuildRoleStatus } from "..";

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
 * Assign a role to a user
 */
export const assignRole = async (
  roleId: number,
  userId: string,
  assignedById?: string,
  options?: { tx?: any }
): Promise<void> => {
  const client = options?.tx || prisma;

  await client.guildRoleMember.upsert({
    where: {
      discordId_guildRoleId: {
        guildRoleId: roleId,
        discordId: userId,
      },
    },
    update: {
      assignedById: assignedById || null,
    },
    create: {
      guildRoleId: roleId,
      discordId: userId,
      assignedById: assignedById || null,
    },
  });
};

/**
 * Remove a role from a user
 */
export const removeRole = async (
  roleId: number,
  userId: string
): Promise<void> => {
  await prisma.guildRoleMember.delete({
    where: {
      discordId_guildRoleId: {
        guildRoleId: roleId,
        discordId: userId,
      },
    },
  });
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
 * Ensure default roles exist for a guild
 */
export const ensureDefaultRoles = async (guildId: string): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // Check if admin role exists
    const adminRole = await tx.guildRole.findFirst({
      where: {
        guildId,
        name: "admin",
        status: GuildRoleStatus.ACTIVE,
      },
    });

    if (!adminRole) {
      // Create admin role with all permissions
      await tx.guildRole.create({
        data: {
          guildId,
          name: "admin",
          position: 1,
          permissions: 0xFFFFFFFn, // All permissions for admin
          status: GuildRoleStatus.ACTIVE,
        },
      });
    }

    // Check if support role exists
    const supportRole = await tx.guildRole.findFirst({
      where: {
        guildId,
        name: "support",
        status: GuildRoleStatus.ACTIVE,
      },
    });

    if (!supportRole) {
      // Create support role with limited permissions
      await tx.guildRole.create({
        data: {
          guildId,
          name: "support",
          position: 2,
          permissions: 0x400446n, // Support permissions
          status: GuildRoleStatus.ACTIVE,
        },
      });
    }

    // Check if member role exists
    const memberRole = await tx.guildRole.findFirst({
      where: {
        guildId,
        name: "member",
        status: GuildRoleStatus.ACTIVE,
      },
    });

    if (!memberRole) {
      // Create member role with basic permissions
      await tx.guildRole.create({
        data: {
          guildId,
          name: "member",
          position: 3,
          permissions: 0x800011n, // Basic member permissions
          status: GuildRoleStatus.ACTIVE,
        },
      });
    }
  });
};

/**
 * Update role with Discord role ID
 */
export const updateRoleDiscordId = async (roleId: number, discordRoleId: string): Promise<void> => {
  await prisma.guildRole.update({
    where: { id: roleId },
    data: { discordRoleId },
  });
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