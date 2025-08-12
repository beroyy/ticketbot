import {
  prisma,
  GuildRoleStatus,
  type GuildRole,
  type GuildRoleMember,
  type DiscordUser,
} from "@ticketsbot/db";
import { PermissionUtils, DefaultRolePermissions, ALL_PERMISSIONS } from "../../permissions/utils";

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
    // Check if user is guild owner
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerDiscordId: true },
    });

    if (guild?.ownerDiscordId === userId) {
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
   * Check if user has a specific permission
   */
  export const hasPermission = async (
    guildId: string,
    userId: string,
    permission: bigint
  ): Promise<boolean> => {
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
  export const ensureDefaultRoles = async (
    guildId: string,
    options?: { tx?: any }
  ): Promise<void> => {
    const operation = async (client: any) => {
      // Use upsert to handle race conditions and ensure idempotency
      await client.guildRole.upsert({
        where: {
          guildId_name: {
            guildId: guildId,
            name: "admin",
          },
        },
        update: {
          // Update these fields if the role already exists
          isDefault: true,
          permissions: DefaultRolePermissions.admin,
        },
        create: {
          guildId: guildId,
          name: "admin",
          color: "#5865F2",
          position: 100,
          isDefault: true,
          permissions: DefaultRolePermissions.admin,
        },
      });

      await client.guildRole.upsert({
        where: {
          guildId_name: {
            guildId: guildId,
            name: "support",
          },
        },
        update: {
          // Update these fields if the role already exists
          isDefault: true,
          permissions: DefaultRolePermissions.support,
        },
        create: {
          guildId: guildId,
          name: "support",
          color: "#57F287",
          position: 50,
          isDefault: true,
          permissions: DefaultRolePermissions.support,
        },
      });

      await client.guildRole.upsert({
        where: {
          guildId_name: {
            guildId: guildId,
            name: "viewer",
          },
        },
        update: {
          // Update these fields if the role already exists
          isDefault: true,
          permissions: DefaultRolePermissions.viewer,
        },
        create: {
          guildId: guildId,
          name: "viewer",
          color: "#99AAB5",
          position: 10,
          isDefault: true,
          permissions: DefaultRolePermissions.viewer,
        },
      });
    };

    // If transaction client provided, use it. Otherwise create new transaction
    if (options?.tx) {
      await operation(options.tx);
    } else {
      await prisma.$transaction(async (tx) => operation(tx));
    }
  };

  /**
   * Assign a role to a user
   */
  export const assignRole = async (
    roleId: number,
    userId: string,
    assignedById?: string,
    options?: { tx?: any }
  ): Promise<GuildRoleMember> => {
    const db = options?.tx || prisma;
    const result = await db.guildRoleMember.upsert({
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

    return result;
  };

  /**
   * Remove a role from a user
   */
  export const removeRole = async (roleId: number, userId: string): Promise<GuildRoleMember> => {
    const result = await prisma.guildRoleMember.delete({
      where: {
        discordId_guildRoleId: {
          discordId: userId,
          guildRoleId: roleId,
        },
      },
    });

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
    const result = await prisma.guildRole.update({
      where: { id: roleId },
      data: { permissions },
    });

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

    return result;
  };

  /**
   * Get a specific role by name
   */
  export const getRoleByName = async (
    guildId: string,
    name: string,
    options?: { tx?: any }
  ): Promise<GuildRole | null> => {
    const db = options?.tx || prisma;
    return db.guildRole.findFirst({
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
