import { prisma } from "../../client";
import { GuildRoleStatus } from "../..";

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
 * Assign a user to a role by role name
 * Handles user existence check, role lookup, and assignment in a transaction
 * Used by addadmin and addsupport commands
 */
export const assignUserToRole = async (
  guildId: string,
  userId: string,
  roleName: string,
  assignedById?: string,
  userData?: {
    username: string;
    discriminator: string;
    avatarUrl: string;
  }
): Promise<{ role: any; alreadyHasRole: boolean }> => {
  return prisma.$transaction(async (tx) => {
    // Ensure default roles exist
    await ensureDefaultRoles(guildId);

    // Get the role by name
    const role = await tx.guildRole.findFirst({
      where: {
        guildId,
        name: roleName.toLowerCase(),
        status: GuildRoleStatus.ACTIVE,
      },
    });

    if (!role) {
      throw { code: "role_not_found", message: `Role "${roleName}" not found` };
    }

    // Check if user already has the role
    const existingMembership = await tx.guildRoleMember.findUnique({
      where: {
        discordId_guildRoleId: {
          discordId: userId,
          guildRoleId: role.id,
        },
      },
    });

    if (existingMembership) {
      return { role, alreadyHasRole: true };
    }

    // Ensure user exists in database if userData provided
    if (userData) {
      await tx.discordUser.upsert({
        where: { id: userId },
        update: {
          username: userData.username,
          discriminator: userData.discriminator,
          avatarUrl: userData.avatarUrl,
        },
        create: {
          id: userId,
          username: userData.username,
          discriminator: userData.discriminator,
          avatarUrl: userData.avatarUrl,
        },
      });
    }

    // Assign the role
    await tx.guildRoleMember.create({
      data: {
        guildRoleId: role.id,
        discordId: userId,
        assignedById: assignedById || null,
      },
    });

    return { role, alreadyHasRole: false };
  });
};

/**
 * Remove a user from a role by role name
 * Handles role lookup and removal
 */
export const removeUserFromRole = async (
  guildId: string,
  userId: string,
  roleName: string
): Promise<{ role: any; wasRemoved: boolean }> => {
  return prisma.$transaction(async (tx) => {
    // Get the role by name
    const role = await tx.guildRole.findFirst({
      where: {
        guildId,
        name: roleName.toLowerCase(),
        status: GuildRoleStatus.ACTIVE,
      },
    });

    if (!role) {
      throw { code: "role_not_found", message: `Role "${roleName}" not found` };
    }

    // Try to delete the membership
    try {
      await tx.guildRoleMember.delete({
        where: {
          discordId_guildRoleId: {
            guildRoleId: role.id,
            discordId: userId,
          },
        },
      });
      return { role, wasRemoved: true };
    } catch (error: any) {
      // If record not found, user didn't have the role
      if (error.code === "P2025") {
        return { role, wasRemoved: false };
      }
      throw error;
    }
  });
};