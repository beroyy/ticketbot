import { prisma } from "../../prisma/client";
import {
  GuildRoleStatus,
  type GuildRole,
  type GuildRoleMember,
  type DiscordUser,
} from "@prisma/client";
import { PermissionUtils, DefaultRolePermissions, ALL_PERMISSIONS } from "../../utils/permissions";
import { Redis } from "../../redis";
import { logger } from "../../utils/logger";

// Export specific schemas
export {
  RoleStatusSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignRoleSchema,
  RemoveRoleSchema,
  SetAdditionalPermissionsSchema,
  PermissionCheckSchema,
  BatchPermissionCheckSchema,
  RoleQuerySchema,
  RoleMemberQuerySchema,
  RoleWithMembersSchema,
  UserPermissionsResponseSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
  type AssignRoleInput,
  type RemoveRoleInput,
  type SetAdditionalPermissionsInput,
  type PermissionCheckInput,
  type BatchPermissionCheckInput,
  type RoleQuery,
  type RoleMemberQuery,
  type RoleWithMembers,
  type UserPermissionsResponse,
} from "./schemas";

export namespace Role {
  // Re-export Prisma types for domain consumers
  export type Role = GuildRole;
  export type RoleMember = GuildRoleMember;

  // Rich domain types
  export type RoleMemberWithDetails = GuildRoleMember & {
    guildRole: GuildRole;
    discordUser: DiscordUser;
  };

  /**
   * Get all roles for a user in a guild
   */
  export const getUserRoles = async (guildId: string, userId: string): Promise<GuildRole[]> => {
    const roleMembers = await prisma.guildRoleMember.findMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId: guildId,
          status: GuildRoleStatus.ACTIVE,
        },
      },
      include: {
        guildRole: true,
      },
    });

    return roleMembers.map((rm: GuildRoleMember & { guildRole: GuildRole }) => rm.guildRole);
  };

  /**
   * Get cumulative permissions for a user (from all roles + additional permissions)
   */
  export const getUserPermissions = async (guildId: string, userId: string): Promise<bigint> => {
    // Development mode permission override - check this first before cache
    if (process.env["NODE_ENV"] === "development" && process.env["DEV_PERMISSIONS_HEX"]) {
      const devPerms = BigInt(process.env["DEV_PERMISSIONS_HEX"]);
      console.log(
        `🔧 DEV MODE: getUserPermissions returning DEV_PERMISSIONS_HEX ${process.env["DEV_PERMISSIONS_HEX"]} for user ${userId} in guild ${guildId}`
      );
      return devPerms;
    }

    // Try Redis cache if available
    const cacheKey = `perms:${guildId}:${userId}`;
    if (Redis.isAvailable()) {
      const cached = await Redis.withRetry(
        async (client) => client.get(cacheKey),
        `getUserPermissions.get(${guildId}:${userId})`
      );
      if (cached) {
        logger.debug(`Found cached permissions for ${userId} in guild ${guildId}: ${cached}`);
        return BigInt(cached);
      } else {
        logger.debug(
          `No cached permissions found for ${userId} in guild ${guildId}, calculating...`
        );
      }
    }

    // Check if user is guild owner
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerDiscordId: true },
    });

    logger.debug(`Checking guild ownership for getUserPermissions:`, {
      guildId,
      userId,
      guildOwnerDiscordId: guild?.ownerDiscordId,
      isOwner: guild?.ownerDiscordId === userId,
    });

    if (guild?.ownerDiscordId === userId) {
      logger.debug(`👑 User ${userId} is owner of guild ${guildId}, granting all permissions`);
      const allPerms = ALL_PERMISSIONS;

      // Cache the result
      if (Redis.isAvailable()) {
        await Redis.withRetry(
          async (client) => client.setEx(cacheKey, 300, allPerms.toString()),
          `getUserPermissions.set(${guildId}:${userId})`
        );
      }

      return allPerms;
    }

    // Get permissions from all roles
    const roles = await getUserRoles(guildId, userId);
    const rolePermissions = roles.map((role: GuildRole) => role.permissions);

    // Use BitField to combine role permissions
    const combinedPermissions = PermissionUtils.getCumulativePermissions(rolePermissions);

    // Get additional permissions
    const additionalPerms = await prisma.guildMemberPermission.findUnique({
      where: {
        discordId_guildId: {
          discordId: userId,
          guildId: guildId,
        },
      },
    });

    let finalPermissions = combinedPermissions;
    if (additionalPerms) {
      // Use BitField to add additional permissions
      finalPermissions = PermissionUtils.addPermissions(
        combinedPermissions,
        additionalPerms.additionalPermissions
      );
    }

    // Cache the result
    if (Redis.isAvailable()) {
      await Redis.withRetry(
        async (client) => client.setEx(cacheKey, 300, finalPermissions.toString()),
        `getUserPermissions.set(${guildId}:${userId})`
      );
    }

    return finalPermissions;
  };

  /**
   * Check if user has a specific permission
   */
  export const hasPermission = async (
    guildId: string,
    userId: string,
    permission: bigint
  ): Promise<boolean> => {
    // Development mode permission override
    if (process.env["NODE_ENV"] === "development" && process.env["DEV_PERMISSIONS_HEX"]) {
      const devPerms = BigInt(process.env["DEV_PERMISSIONS_HEX"]);
      if (PermissionUtils.hasPermission(devPerms, permission)) {
        console.log(
          `🔧 DEV MODE: Granting permission ${permission.toString(16)} via DEV_PERMISSIONS_HEX`
        );
        return true;
      }
    }

    const userPermissions = await getUserPermissions(guildId, userId);
    return PermissionUtils.hasPermission(userPermissions, permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  export const hasAnyPermission = async (
    guildId: string,
    userId: string,
    ...permissions: bigint[]
  ): Promise<boolean> => {
    // Development mode permission override
    if (process.env["NODE_ENV"] === "development" && process.env["DEV_PERMISSIONS_HEX"]) {
      const devPerms = BigInt(process.env["DEV_PERMISSIONS_HEX"]);
      const hasAny = PermissionUtils.hasAnyPermission(devPerms, ...permissions);
      if (hasAny) {
        console.log(
          `🔧 DEV MODE: Granting one of ${permissions.length.toString()} permissions via DEV_PERMISSIONS_HEX`
        );
        return true;
      }
    }

    const userPermissions = await getUserPermissions(guildId, userId);
    return PermissionUtils.hasAnyPermission(userPermissions, ...permissions);
  };

  /**
   * Check if user has all of the specified permissions
   */
  export const hasAllPermissions = async (
    guildId: string,
    userId: string,
    ...permissions: bigint[]
  ): Promise<boolean> => {
    // Development mode permission override
    if (process.env["NODE_ENV"] === "development" && process.env["DEV_PERMISSIONS_HEX"]) {
      const devPerms = BigInt(process.env["DEV_PERMISSIONS_HEX"]);
      const hasAll = PermissionUtils.hasAllPermissions(devPerms, ...permissions);
      if (hasAll) {
        console.log(
          `🔧 DEV MODE: Granting all ${permissions.length.toString()} permissions via DEV_PERMISSIONS_HEX`
        );
        return true;
      }
    }

    const userPermissions = await getUserPermissions(guildId, userId);
    return PermissionUtils.hasAllPermissions(userPermissions, ...permissions);
  };

  /**
   * Get permission names for a user
   */
  export const getUserPermissionNames = async (
    guildId: string,
    userId: string
  ): Promise<string[]> => {
    const userPermissions = await getUserPermissions(guildId, userId);
    return PermissionUtils.getPermissionNames(userPermissions);
  };

  /**
   * Ensure default roles exist for a guild
   */
  export const ensureDefaultRoles = async (guildId: string): Promise<void> => {
    // Check if admin role exists
    const adminRole = await prisma.guildRole.findFirst({
      where: {
        guildId: guildId,
        name: "admin",
        isDefault: true,
      },
    });

    if (!adminRole) {
      await prisma.guildRole.create({
        data: {
          guildId: guildId,
          name: "admin",
          color: "#5865F2",
          position: 100,
          isDefault: true,
          permissions: DefaultRolePermissions.admin,
        },
      });
    }

    // Check if support role exists
    const supportRole = await prisma.guildRole.findFirst({
      where: {
        guildId: guildId,
        name: "support",
        isDefault: true,
      },
    });

    if (!supportRole) {
      await prisma.guildRole.create({
        data: {
          guildId: guildId,
          name: "support",
          color: "#57F287",
          position: 50,
          isDefault: true,
          permissions: DefaultRolePermissions.support,
        },
      });
    }

    // Check if viewer role exists
    const viewerRole = await prisma.guildRole.findFirst({
      where: {
        guildId: guildId,
        name: "viewer",
        isDefault: true,
      },
    });

    if (!viewerRole) {
      await prisma.guildRole.create({
        data: {
          guildId: guildId,
          name: "viewer",
          color: "#99AAB5",
          position: 10,
          isDefault: true,
          permissions: DefaultRolePermissions.viewer,
        },
      });
    }
  };

  /**
   * Assign a role to a user
   */
  export const assignRole = async (
    roleId: number,
    userId: string,
    assignedById?: string
  ): Promise<GuildRoleMember> => {
    // Get the role to find the guild ID
    const role = await prisma.guildRole.findUnique({
      where: { id: roleId },
      select: { guildId: true },
    });

    const result = await prisma.guildRoleMember.upsert({
      where: {
        discordId_guildRoleId: {
          discordId: userId,
          guildRoleId: roleId,
        },
      },
      update: {
        assignedAt: new Date(),
        assignedById: assignedById ?? null,
      },
      create: {
        guildRoleId: roleId,
        discordId: userId,
        assignedById: assignedById ?? null,
      },
    });

    // Invalidate permission cache
    if (role && Redis.isAvailable()) {
      await Redis.withRetry(
        async (client) => client.del(`perms:${role.guildId}:${userId}`),
        `assignRole.invalidate(${role.guildId}:${userId})`
      );
    }

    return result;
  };

  /**
   * Remove a role from a user
   */
  export const removeRole = async (roleId: number, userId: string): Promise<GuildRoleMember> => {
    // Get the role to find the guild ID
    const role = await prisma.guildRole.findUnique({
      where: { id: roleId },
      select: { guildId: true },
    });

    const result = await prisma.guildRoleMember.delete({
      where: {
        discordId_guildRoleId: {
          discordId: userId,
          guildRoleId: roleId,
        },
      },
    });

    // Invalidate permission cache
    if (role && Redis.isAvailable()) {
      await Redis.withRetry(
        async (client) => client.del(`perms:${role.guildId}:${userId}`),
        `assignRole.invalidate(${role.guildId}:${userId})`
      );
    }

    return result;
  };

  /**
   * Get all team roles for a guild
   */
  export const getRoles = async (guildId: string): Promise<GuildRole[]> => {
    return prisma.guildRole.findMany({
      where: { guildId: guildId },
      orderBy: { position: "desc" },
    });
  };

  /**
   * Update team role permissions
   */
  export const updateRolePermissions = async (
    roleId: number,
    permissions: bigint
  ): Promise<GuildRole> => {
    // Get the role to find the guild ID
    const role = await prisma.guildRole.findUnique({
      where: { id: roleId },
      select: { guildId: true },
    });

    const result = await prisma.guildRole.update({
      where: { id: roleId },
      data: { permissions },
    });

    // Invalidate all user permission caches for this guild
    if (role && Redis.isAvailable()) {
      await Redis.withRetry(async (client) => {
        let count = 0;
        for await (const keys of client.scanIterator({
          MATCH: `perms:${role.guildId}:*`,
          COUNT: 100,
        })) {
          for (const key of keys) {
            if (key && key !== "") {
              await client.del(key);
              count++;
            }
          }
        }
        return count;
      }, `updateRolePermissions.invalidateGuild(${role.guildId})`);
    }

    return result;
  };

  /**
   * Set additional permissions for a user
   */
  export const setAdditionalPermissions = async (
    guildId: string,
    userId: string,
    permissions: bigint
  ) => {
    const result = await prisma.guildMemberPermission.upsert({
      where: {
        discordId_guildId: {
          discordId: userId,
          guildId: guildId,
        },
      },
      update: {
        additionalPermissions: permissions,
      },
      create: {
        discordId: userId,
        guildId: guildId,
        additionalPermissions: permissions,
      },
    });

    // Invalidate user permission cache
    if (Redis.isAvailable()) {
      await Redis.withRetry(
        async (client) => client.del(`perms:${guildId}:${userId}`),
        `setAdditionalPermissions.invalidate(${guildId}:${userId})`
      );
    }

    return result;
  };

  /**
   * Get a specific role by name
   */
  export const getRoleByName = async (guildId: string, name: string): Promise<GuildRole | null> => {
    return prisma.guildRole.findFirst({
      where: {
        guildId,
        name,
      },
    });
  };

  /**
   * Update a role's Discord role ID
   */
  export const updateRoleDiscordId = async (
    roleId: number,
    discordRoleId: string | null
  ): Promise<GuildRole> => {
    return prisma.guildRole.update({
      where: { id: roleId },
      data: { discordRoleId },
    });
  };

  /**
   * Get all members of a specific role
   */
  export const getRoleMembers = async (
    roleId: number
  ): Promise<(GuildRoleMember & { user: { username: string; avatarUrl: string | null } })[]> => {
    const members = await prisma.guildRoleMember.findMany({
      where: { guildRoleId: roleId },
    });

    // Get user details separately
    const usersMap = new Map<string, { username: string; avatarUrl: string | null }>();
    const userIds = [...new Set(members.map((m) => m.discordId))];

    if (userIds.length > 0) {
      const users = await prisma.discordUser.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, avatarUrl: true },
      });

      for (const user of users) {
        usersMap.set(user.id, { username: user.username, avatarUrl: user.avatarUrl });
      }
    }

    // Combine the data
    return members.map((member) => ({
      ...member,
      user: usersMap.get(member.discordId) || { username: "Unknown User", avatarUrl: null },
    }));
  };

  /**
   * Remove all roles from a user in a guild
   */
  export const removeAllRoles = async (guildId: string, userId: string): Promise<number> => {
    // Get all role IDs for this user in this guild
    const roleMembers = await prisma.guildRoleMember.findMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId,
        },
      },
      select: {
        guildRoleId: true,
      },
    });

    if (roleMembers.length === 0) {
      return 0;
    }

    // Delete all role memberships
    const result = await prisma.guildRoleMember.deleteMany({
      where: {
        discordId: userId,
        guildRoleId: {
          in: roleMembers.map((rm) => rm.guildRoleId),
        },
      },
    });

    // Invalidate permission cache
    if (Redis.isAvailable()) {
      await Redis.withRetry(
        async (client) => client.del(`perms:${guildId}:${userId}`),
        `removeAllRoles.invalidate(${guildId}:${userId})`
      );
    }

    return result.count;
  };

  /**
   * Get all active team members in a guild
   * Returns unique team members across all active roles
   */
  export const getActiveMembers = async (guildId: string): Promise<string[]> => {
    const members = await prisma.guildRoleMember.findMany({
      where: {
        guildRole: {
          guildId,
          status: GuildRoleStatus.ACTIVE,
        },
      },
      select: {
        discordId: true,
      },
      distinct: ["discordId"],
    });

    return members.map((m) => m.discordId);
  };

  /**
   * Get all active team members with their details
   * Returns team members with their Discord user info
   */
  export const getActiveMembersWithDetails = async (guildId: string): Promise<any> => {
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
}
