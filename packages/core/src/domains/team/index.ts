import { prisma, type TeamRole, type TeamRoleMember, TeamRoleStatus } from "../../prisma/client";
import { PermissionUtils, DefaultRolePermissions, ALL_PERMISSIONS } from "../../utils/permissions";
import { cacheService, CacheKeys, CacheTTL } from "../../prisma/services/cache";

// Export specific schemas
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

export namespace Team {
  // Re-export Prisma types for domain consumers
  export type Role = TeamRole;
  export type RoleMember = TeamRoleMember;

  // Rich domain types
  export type RoleMemberWithDetails = TeamRoleMember & {
    teamRole: TeamRole;
    discordUser: import("../../prisma/client").DiscordUser;
  };

  /**
   * Get all roles for a user in a guild
   */
  export const getUserRoles = async (guildId: string, userId: string): Promise<TeamRole[]> => {
    // Check cache first
    const cacheKey = CacheKeys.userRoles(guildId, userId);
    const cached = cacheService.get(cacheKey) as TeamRole[] | null;
    if (cached !== null) {
      return cached;
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

    const roles = roleMembers.map((rm: TeamRoleMember & { teamRole: TeamRole }) => rm.teamRole);

    // Cache the result
    cacheService.set(cacheKey, roles, CacheTTL.userRoles);

    return roles;
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

    // Check cache first
    const cacheKey = CacheKeys.userPermissions(guildId, userId);
    const cached = cacheService.get(cacheKey) as string | null;
    if (cached !== null) {
      return BigInt(cached);
    }

    // Check if user is guild owner
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerDiscordId: true },
    });

    if (guild?.ownerDiscordId === userId) {
      console.log(`👑 User ${userId} is owner of guild ${guildId}, granting all permissions`);
      const allPerms = ALL_PERMISSIONS;
      cacheService.set(cacheKey, allPerms.toString(), CacheTTL.permissions);
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

    // Cache the result (store as string since BigInt can't be JSON serialized)
    cacheService.set(cacheKey, finalPermissions.toString(), CacheTTL.permissions);

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
    // Check cache first
    const cacheKey = CacheKeys.defaultRoles(guildId);
    const cached = cacheService.get(cacheKey) as boolean | null;
    if (cached === true) {
      return;
    }

    // Check if admin role exists
    const adminRole = await prisma.teamRole.findFirst({
      where: {
        guildId: guildId,
        name: "admin",
        isDefault: true,
      },
    });

    if (!adminRole) {
      await prisma.teamRole.create({
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
    const supportRole = await prisma.teamRole.findFirst({
      where: {
        guildId: guildId,
        name: "support",
        isDefault: true,
      },
    });

    if (!supportRole) {
      await prisma.teamRole.create({
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

    // Cache that we've ensured default roles exist
    cacheService.set(cacheKey, true, CacheTTL.defaultRoles);
  };

  /**
   * Assign a role to a user
   */
  export const assignRole = async (
    roleId: number,
    userId: string,
    assignedById?: string
  ): Promise<TeamRoleMember> => {
    // Get the role to find the guild ID
    const role = await prisma.teamRole.findUnique({
      where: { id: roleId },
      select: { guildId: true },
    });

    const result = await prisma.teamRoleMember.upsert({
      where: {
        discordId_teamRoleId: {
          discordId: userId,
          teamRoleId: roleId,
        },
      },
      update: {
        assignedAt: new Date(),
        assignedById: assignedById ?? null,
      },
      create: {
        teamRoleId: roleId,
        discordId: userId,
        assignedById: assignedById ?? null,
      },
    });

    // Invalidate caches
    if (role) {
      cacheService.delete(CacheKeys.userPermissions(role.guildId, userId));
      cacheService.delete(CacheKeys.userRoles(role.guildId, userId));
    }

    return result;
  };

  /**
   * Remove a role from a user
   */
  export const removeRole = async (roleId: number, userId: string): Promise<TeamRoleMember> => {
    // Get the role to find the guild ID
    const role = await prisma.teamRole.findUnique({
      where: { id: roleId },
      select: { guildId: true },
    });

    const result = await prisma.teamRoleMember.delete({
      where: {
        discordId_teamRoleId: {
          discordId: userId,
          teamRoleId: roleId,
        },
      },
    });

    // Invalidate caches
    if (role) {
      cacheService.delete(CacheKeys.userPermissions(role.guildId, userId));
      cacheService.delete(CacheKeys.userRoles(role.guildId, userId));
    }

    return result;
  };

  /**
   * Get all team roles for a guild
   */
  export const getRoles = async (guildId: string): Promise<TeamRole[]> => {
    return prisma.teamRole.findMany({
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
  ): Promise<TeamRole> => {
    // Get the role to find the guild ID
    const role = await prisma.teamRole.findUnique({
      where: { id: roleId },
      select: { guildId: true },
    });

    const result = await prisma.teamRole.update({
      where: { id: roleId },
      data: { permissions },
    });

    // Invalidate all user permission caches for this guild
    if (role) {
      cacheService.deletePattern(CacheKeys.guildPattern(role.guildId));
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
    const result = await prisma.teamMemberPermission.upsert({
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
    cacheService.delete(CacheKeys.userPermissions(guildId, userId));

    return result;
  };

  /**
   * Get a specific role by name
   */
  export const getRoleByName = async (guildId: string, name: string): Promise<TeamRole | null> => {
    return prisma.teamRole.findFirst({
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
  ): Promise<TeamRole> => {
    return prisma.teamRole.update({
      where: { id: roleId },
      data: { discordRoleId },
    });
  };

  /**
   * Get all members of a specific role
   */
  export const getRoleMembers = async (
    roleId: number
  ): Promise<(TeamRoleMember & { user: { username: string; avatarUrl: string | null } })[]> => {
    const members = await prisma.teamRoleMember.findMany({
      where: { teamRoleId: roleId },
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
    const roleMembers = await prisma.teamRoleMember.findMany({
      where: {
        discordId: userId,
        teamRole: {
          guildId,
        },
      },
      select: {
        teamRoleId: true,
      },
    });

    if (roleMembers.length === 0) {
      return 0;
    }

    // Delete all role memberships
    const result = await prisma.teamRoleMember.deleteMany({
      where: {
        discordId: userId,
        teamRoleId: {
          in: roleMembers.map((rm) => rm.teamRoleId),
        },
      },
    });

    // Invalidate caches
    cacheService.delete(CacheKeys.userPermissions(guildId, userId));
    cacheService.delete(CacheKeys.userRoles(guildId, userId));

    return result.count;
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
