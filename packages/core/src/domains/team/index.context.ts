import { prisma } from "../../prisma/client";
import { TeamRoleStatus, type TeamRole, type TeamRoleMember } from "@prisma/client";
import { PermissionUtils, DefaultRolePermissions, ALL_PERMISSIONS } from "../../utils/permissions";
import { Redis } from "../../redis";
import { logger } from "../../utils/logger";
import { Actor, withTransaction, afterTransaction, useTransaction } from "../../context";
import { PermissionFlags } from "../../schemas/permissions-constants";

// Export schemas
export {
  TeamRoleStatusSchema,
  CreateTeamRoleSchema,
  UpdateTeamRoleSchema,
  AssignRoleSchema,
  RemoveRoleSchema,
  SetAdditionalPermissionsSchema,
  PermissionCheckSchema,
  BatchPermissionCheckSchema,
  TeamRoleQuerySchema,
  TeamMemberQuerySchema,
  TeamRoleWithMembersSchema,
  UserPermissionsResponseSchema,
  type CreateTeamRoleInput,
  type UpdateTeamRoleInput,
  type AssignRoleInput,
  type RemoveRoleInput,
  type SetAdditionalPermissionsInput,
  type PermissionCheckInput,
  type BatchPermissionCheckInput,
  type TeamRoleQuery,
  type TeamMemberQuery,
  type TeamRoleWithMembers,
  type UserPermissionsResponse,
} from "./schemas";

/**
 * Context-aware Team domain methods
 * These methods automatically use actor context for permissions and guild context
 */
export namespace Team {
  /**
   * Get all roles for the current user
   * No permission required - users can always see their own roles
   */
  export const getMyRoles = async (): Promise<TeamRole[]> => {
    const userId = Actor.userId();
    const guildId = Actor.guildId();

    return getUserRoles(guildId, userId);
  };

  /**
   * Get all roles for a specific user
   * Requires MEMBER_VIEW permission to view other users' roles
   */
  export const getUserRoles = async (guildId: string, userId: string): Promise<TeamRole[]> => {
    const actor = Actor.maybeUse();

    // Check if viewing own roles
    if (actor && actor.type !== "system" && Actor.userId() !== userId) {
      Actor.requirePermission(PermissionFlags.MEMBER_VIEW);
    }

    const roleMembers = await prisma.teamRoleMember.findMany({
      where: {
        discordId: userId,
        teamRole: {
          guildId: guildId,
          status: TeamRoleStatus.ACTIVE,
        },
      },
      include: {
        teamRole: true,
      },
    });

    return roleMembers.map((rm: TeamRoleMember & { teamRole: TeamRole }) => rm.teamRole);
  };

  /**
   * Get cumulative permissions for the current user
   * This is automatically calculated from context
   */
  export const getMyPermissions = async (): Promise<bigint> => {
    const actor = Actor.use();

    // Discord actors already have permissions calculated
    if (actor.type === "discord_user") {
      return actor.properties.permissions;
    }

    // Web users need permissions calculated
    if (actor.type === "web_user" && actor.properties.selectedGuildId) {
      return getUserPermissions(actor.properties.selectedGuildId, actor.properties.userId);
    }

    // System actors have all permissions
    if (actor.type === "system") {
      return ALL_PERMISSIONS;
    }

    return 0n;
  };

  /**
   * Get cumulative permissions for a user (from all roles + additional permissions)
   * Used internally by context system
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
        return BigInt(cached);
      }
    }

    // Check if user is guild owner
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerDiscordId: true },
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
    const rolePermissions = roles.map((role: TeamRole) => role.permissions);

    // Use BitField to combine role permissions
    const combinedPermissions = PermissionUtils.getCumulativePermissions(rolePermissions);

    // Get additional permissions
    const additionalPerms = await prisma.teamMemberPermission.findUnique({
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
   * Get all team roles for the current guild
   * Requires ROLE_VIEW permission
   */
  export const getRoles = async (): Promise<TeamRole[]> => {
    Actor.requirePermission(PermissionFlags.MEMBER_VIEW);
    const guildId = Actor.guildId();

    return prisma.teamRole.findMany({
      where: { guildId },
      orderBy: { position: "desc" },
    });
  };

  /**
   * Create a new team role
   * Requires ROLE_CREATE permission
   */
  export const createRole = async (data: {
    name: string;
    color: string;
    permissions: bigint;
    position?: number;
  }) => {
    Actor.requirePermission(PermissionFlags.ROLE_CREATE);
    const guildId = Actor.guildId();
    const userId = Actor.userId();

    return withTransaction(async () => {
      const tx = useTransaction();

      const role = await tx.teamRole.create({
        data: {
          guildId,
          name: data.name,
          color: data.color,
          permissions: data.permissions,
          position: data.position ?? 0,
          isDefault: false,
        },
      });

      afterTransaction(async () => {
        // TODO: Add event logging when eventLog model is available
        console.log(`Role created: ${role.name} by ${userId}`);
      });

      return role;
    });
  };

  /**
   * Update team role permissions
   * Requires ROLE_EDIT permission
   */
  export const updateRolePermissions = async (
    roleId: number,
    permissions: bigint
  ): Promise<TeamRole> => {
    Actor.requirePermission(PermissionFlags.ROLE_EDIT);
    const guildId = Actor.guildId();
    const userId = Actor.userId();

    return withTransaction(async () => {
      const tx = useTransaction();

      // Verify role belongs to guild
      const role = await tx.teamRole.findUnique({
        where: { id: roleId },
        select: { guildId: true, name: true },
      });

      if (!role || role.guildId !== guildId) {
        throw new Error("Role not found");
      }

      const result = await tx.teamRole.update({
        where: { id: roleId },
        data: { permissions },
      });

      afterTransaction(async () => {
        // Invalidate all user permission caches for this guild
        if (Redis.isAvailable()) {
          await Redis.withRetry(
            async (client) => {
              let count = 0;
              for await (const keys of client.scanIterator({
                MATCH: `perms:${guildId}:*`,
                COUNT: 100
              })) {
                for (const key of keys) {
                  if (key && key !== '') {
                    await client.del(key);
                    count++;
                  }
                }
              }
              return count;
            },
            `updateRolePermissions.invalidateGuild(${guildId})`
          );
        }

        // TODO: Add event logging when eventLog model is available
        console.log(`Role permissions updated: ${role.name} by ${userId}`);
      });

      return result;
    });
  };

  /**
   * Assign a role to a user
   * Requires ROLE_ASSIGN permission
   */
  export const assignRole = async (
    roleId: number,
    targetUserId: string
  ): Promise<TeamRoleMember> => {
    Actor.requirePermission(PermissionFlags.ROLE_ASSIGN);
    const guildId = Actor.guildId();
    const assignedById = Actor.userId();

    return withTransaction(async () => {
      const tx = useTransaction();

      // Verify role belongs to guild
      const role = await tx.teamRole.findUnique({
        where: { id: roleId },
        select: { guildId: true, name: true },
      });

      if (!role || role.guildId !== guildId) {
        throw new Error("Role not found");
      }

      const result = await tx.teamRoleMember.upsert({
        where: {
          discordId_teamRoleId: {
            discordId: targetUserId,
            teamRoleId: roleId,
          },
        },
        update: {
          assignedAt: new Date(),
          assignedById,
        },
        create: {
          teamRoleId: roleId,
          discordId: targetUserId,
          assignedById,
        },
      });

      afterTransaction(async () => {
        // Invalidate permission cache
        if (Redis.isAvailable()) {
          await Redis.withRetry(
            async (client) => client.del(`perms:${guildId}:${targetUserId}`),
            `assignRole.invalidate(${guildId}:${targetUserId})`
          );
        }

        // TODO: Add event logging when eventLog model is available
        console.log(`Role assigned: ${role.name} to ${targetUserId} by ${assignedById}`);
      });

      return result;
    });
  };

  /**
   * Remove a role from a user
   * Requires ROLE_ASSIGN permission
   */
  export const removeRole = async (roleId: number, targetUserId: string): Promise<void> => {
    Actor.requirePermission(PermissionFlags.ROLE_ASSIGN);
    const guildId = Actor.guildId();
    const removedById = Actor.userId();

    return withTransaction(async () => {
      const tx = useTransaction();

      // Verify role belongs to guild
      const role = await tx.teamRole.findUnique({
        where: { id: roleId },
        select: { guildId: true, name: true },
      });

      if (!role || role.guildId !== guildId) {
        throw new Error("Role not found");
      }

      await tx.teamRoleMember.delete({
        where: {
          discordId_teamRoleId: {
            discordId: targetUserId,
            teamRoleId: roleId,
          },
        },
      });

      afterTransaction(async () => {
        // Invalidate permission cache
        if (Redis.isAvailable()) {
          await Redis.withRetry(
            async (client) => client.del(`perms:${guildId}:${targetUserId}`),
            `removeRole.invalidate(${guildId}:${targetUserId})`
          );
        }

        // TODO: Add event logging when eventLog model is available
        console.log(`Role removed: ${role.name} from ${targetUserId} by ${removedById}`);
      });
    });
  };

  /**
   * Ensure default roles exist for the current guild
   * Requires ROLE_CREATE permission
   */
  export const ensureDefaultRoles = async (): Promise<void> => {
    Actor.requirePermission(PermissionFlags.ROLE_CREATE);
    const guildId = Actor.guildId();

    await withTransaction(async () => {
      const tx = useTransaction();

      // Check if admin role exists
      const adminRole = await tx.teamRole.findFirst({
        where: {
          guildId,
          name: "admin",
          isDefault: true,
        },
      });

      if (!adminRole) {
        await tx.teamRole.create({
          data: {
            guildId,
            name: "admin",
            color: "#5865F2",
            position: 100,
            isDefault: true,
            permissions: DefaultRolePermissions.admin,
          },
        });
      }

      // Check if support role exists
      const supportRole = await tx.teamRole.findFirst({
        where: {
          guildId,
          name: "support",
          isDefault: true,
        },
      });

      if (!supportRole) {
        await tx.teamRole.create({
          data: {
            guildId,
            name: "support",
            color: "#57F287",
            position: 50,
            isDefault: true,
            permissions: DefaultRolePermissions.support,
          },
        });
      }

      // Check if viewer role exists
      const viewerRole = await tx.teamRole.findFirst({
        where: {
          guildId,
          name: "viewer",
          isDefault: true,
        },
      });

      if (!viewerRole) {
        await tx.teamRole.create({
          data: {
            guildId,
            name: "viewer",
            color: "#99AAB5",
            position: 10,
            isDefault: true,
            permissions: DefaultRolePermissions.viewer,
          },
        });
      }
    });
  };

  /**
   * Get all active roles for a guild
   * No permission required - this is used for channel permissions
   */
  export const getActiveRoles = async (guildId: string): Promise<TeamRole[]> => {
    return prisma.teamRole.findMany({
      where: {
        guildId,
        status: TeamRoleStatus.ACTIVE,
      },
      orderBy: {
        position: "desc",
      },
    });
  };

  /**
   * Get all active team members in a guild
   * Returns unique team members across all active roles
   */
  export const getActiveMembers = async (guildId: string): Promise<string[]> => {
    const members = await prisma.teamRoleMember.findMany({
      where: {
        teamRole: {
          guildId,
          status: TeamRoleStatus.ACTIVE,
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
    return prisma.teamRoleMember.findMany({
      where: {
        teamRole: {
          guildId,
          status: TeamRoleStatus.ACTIVE,
        },
      },
      include: {
        teamRole: true,
        discordUser: true,
      },
      distinct: ["discordId"],
    });
  };
}
