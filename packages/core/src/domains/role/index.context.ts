import { prisma } from "@ticketsbot/db";
import { GuildRoleStatus, type GuildRole, type GuildRoleMember } from "@prisma/client";
import { PermissionUtils, DefaultRolePermissions, ALL_PERMISSIONS } from "../../permissions/utils";
import { logger } from "../../utils/logger";
import { Actor, withTransaction, afterTransaction, useTransaction } from "../../context";
import { PermissionFlags } from "../../permissions/constants";

// Export schemas
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

/**
 * Context-aware Role domain methods
 * These methods automatically use actor context for permissions and guild context
 */
export namespace Role {
  /**
   * Get all roles for the current user
   * No permission required - users can always see their own roles
   */
  export const getMyRoles = async (): Promise<GuildRole[]> => {
    const userId = Actor.userId();
    const guildId = Actor.guildId();

    return getUserRoles(guildId, userId);
  };

  /**
   * Get all roles for a specific user
   * Requires MEMBER_VIEW permission to view other users' roles
   */
  export const getUserRoles = async (guildId: string, userId: string): Promise<GuildRole[]> => {
    const actor = Actor.maybeUse();

    // Check if viewing own roles
    if (actor && actor.type !== "system" && Actor.userId() !== userId) {
      Actor.requirePermission(PermissionFlags.MEMBER_VIEW);
    }

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

    // Check if user is guild owner
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerDiscordId: true },
    });

    if (guild?.ownerDiscordId === userId) {
      logger.debug(`👑 User ${userId} is owner of guild ${guildId}, granting all permissions`);
      const allPerms = ALL_PERMISSIONS;
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

    return finalPermissions;
  };

  /**
   * Get all team roles for the current guild
   * Requires ROLE_VIEW permission
   */
  export const getRoles = async (): Promise<GuildRole[]> => {
    Actor.requirePermission(PermissionFlags.MEMBER_VIEW);
    const guildId = Actor.guildId();

    return prisma.guildRole.findMany({
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

      const role = await tx.guildRole.create({
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
  ): Promise<GuildRole> => {
    Actor.requirePermission(PermissionFlags.ROLE_EDIT);
    const guildId = Actor.guildId();
    const userId = Actor.userId();

    return withTransaction(async () => {
      const tx = useTransaction();

      // Verify role belongs to guild
      const role = await tx.guildRole.findUnique({
        where: { id: roleId },
        select: { guildId: true, name: true },
      });

      if (!role || role.guildId !== guildId) {
        throw new Error("Role not found");
      }

      const result = await tx.guildRole.update({
        where: { id: roleId },
        data: { permissions },
      });

      afterTransaction(async () => {
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
  ): Promise<GuildRoleMember> => {
    Actor.requirePermission(PermissionFlags.ROLE_ASSIGN);
    const guildId = Actor.guildId();
    const assignedById = Actor.userId();

    return withTransaction(async () => {
      const tx = useTransaction();

      // Verify role belongs to guild
      const role = await tx.guildRole.findUnique({
        where: { id: roleId },
        select: { guildId: true, name: true },
      });

      if (!role || role.guildId !== guildId) {
        throw new Error("Role not found");
      }

      const result = await tx.guildRoleMember.upsert({
        where: {
          discordId_guildRoleId: {
            discordId: targetUserId,
            guildRoleId: roleId,
          },
        },
        update: {
          assignedAt: new Date(),
          assignedById,
        },
        create: {
          guildRoleId: roleId,
          discordId: targetUserId,
          assignedById,
        },
      });

      afterTransaction(async () => {
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
      const role = await tx.guildRole.findUnique({
        where: { id: roleId },
        select: { guildId: true, name: true },
      });

      if (!role || role.guildId !== guildId) {
        throw new Error("Role not found");
      }

      await tx.guildRoleMember.delete({
        where: {
          discordId_guildRoleId: {
            discordId: targetUserId,
            guildRoleId: roleId,
          },
        },
      });

      afterTransaction(async () => {
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
      const adminRole = await tx.guildRole.findFirst({
        where: {
          guildId,
          name: "admin",
          isDefault: true,
        },
      });

      if (!adminRole) {
        await tx.guildRole.create({
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
      const supportRole = await tx.guildRole.findFirst({
        where: {
          guildId,
          name: "support",
          isDefault: true,
        },
      });

      if (!supportRole) {
        await tx.guildRole.create({
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
      const viewerRole = await tx.guildRole.findFirst({
        where: {
          guildId,
          name: "viewer",
          isDefault: true,
        },
      });

      if (!viewerRole) {
        await tx.guildRole.create({
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
  export const getActiveRoles = async (guildId: string): Promise<GuildRole[]> => {
    return prisma.guildRole.findMany({
      where: {
        guildId,
        status: GuildRoleStatus.ACTIVE,
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

  /**
   * Remove all roles for a user when they leave the guild
   * Returns count of roles removed
   */
  export const removeAllRoles = async (guildId: string, userId: string): Promise<number> => {
    // Get all role memberships for this user in this guild
    const memberships = await prisma.guildRoleMember.findMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId,
        },
      },
      select: {
        guildRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (memberships.length === 0) {
      return 0;
    }

    // Delete all role memberships
    const result = await prisma.guildRoleMember.deleteMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId,
        },
      },
    });

    // Log the removal
    logger.info(`Removed ${result.count} roles from user ${userId} in guild ${guildId}`, {
      removedRoles: memberships.map((m) => ({
        id: m.guildRole.id,
        name: m.guildRole.name,
      })),
    });

    return result.count;
  };
}
