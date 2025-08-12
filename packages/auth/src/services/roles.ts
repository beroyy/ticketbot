import { db, prisma } from "@ticketsbot/db";
import { logger } from "../utils/logger";

export type OrganizationRole = "owner" | "admin" | "support";


/**
 * Get user's role in an organization (guild)
 */
export async function getUserRole(
  guildId: string,
  userId: string
): Promise<OrganizationRole | null> {
  try {
    // First check if user is the guild owner
    const guild = await db.guild.getGuildById(guildId);
    if (guild?.ownerDiscordId === userId) {
      return "owner";
    }

    // Check for simplified role in GuildRoleMember table
    const member = await prisma.guildRoleMember.findFirst({
      where: {
        discordId: userId,
        role: { not: null },
        guildRole: {
          guildId,
        },
      },
    });

    if (member?.role) {
      return member.role as OrganizationRole;
    }

    // Fallback to checking existing GuildRoleMember table
    const roleMembers = await db.role.getUserRoles(guildId, userId);
    
    // Map old role names to new simplified roles
    for (const role of roleMembers) {
      const roleName = role.name.toLowerCase();
      if (roleName === "admin" || roleName === "administrator") return "admin";
      if (roleName === "support" || roleName === "moderator") return "support";
    }

    return null;
  } catch (error) {
    logger.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  guildId: string,
  userId: string,
  requiredRoles: OrganizationRole[]
): Promise<boolean> {
  const userRole = await getUserRole(guildId, userId);
  if (!userRole) return false;
  
  return requiredRoles.includes(userRole);
}

/**
 * Assign a role to a user in a guild
 */
export async function assignRole(
  guildId: string,
  userId: string,
  role: OrganizationRole
): Promise<boolean> {
  try {
    // Prevent assigning owner role (should only be set via guild ownership)
    if (role === "owner") {
      logger.warn("Cannot manually assign owner role");
      return false;
    }

    // Find or create a GuildRole for this role type
    let guildRole = await prisma.guildRole.findFirst({
      where: {
        guildId,
        name: role,
      },
    });

    if (!guildRole) {
      guildRole = await prisma.guildRole.create({
        data: {
          guildId,
          name: role,
          position: role === "admin" ? 1 : 2,  // Owner role check is handled earlier
        },
      });
    }

    // Check if member already exists
    const existingMember = await prisma.guildRoleMember.findFirst({
      where: {
        discordId: userId,
        guildRoleId: guildRole.id,
      },
    });

    if (!existingMember) {
      // Create new member with role
      await prisma.guildRoleMember.create({
        data: {
          discordId: userId,
          guildRoleId: guildRole.id,
          role,
        },
      });
    } else {
      // Update existing member's role
      await prisma.guildRoleMember.update({
        where: {
          id: existingMember.id,
        },
        data: {
          role,
        },
      });
    }

    logger.info(`Assigned ${role} role to user ${userId} in guild ${guildId}`);
    return true;
  } catch (error) {
    logger.error("Error assigning role:", error);
    return false;
  }
}

/**
 * Remove a user's role in a guild
 */
export async function removeRole(
  guildId: string,
  userId: string
): Promise<boolean> {
  try {
    // Remove all role assignments for this user in this guild
    await prisma.guildRoleMember.deleteMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId,
        },
      },
    });

    logger.info(`Removed role from user ${userId} in guild ${guildId}`);
    return true;
  } catch (error) {
    logger.error("Error removing role:", error);
    return false;
  }
}

/**
 * Update a user's role in a guild
 */
export async function updateRole(
  guildId: string,
  userId: string,
  newRole: OrganizationRole
): Promise<boolean> {
  try {
    // Prevent changing to owner role
    if (newRole === "owner") {
      logger.warn("Cannot manually set owner role");
      return false;
    }

    // Find existing member records
    const existingMembers = await prisma.guildRoleMember.findMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId,
        },
      },
    });

    // Update all existing records with the new role
    await prisma.guildRoleMember.updateMany({
      where: {
        discordId: userId,
        guildRole: {
          guildId,
        },
      },
      data: {
        role: newRole,
      },
    });

    // If no existing records, assign the new role
    if (existingMembers.length === 0) {
      await assignRole(guildId, userId, newRole);
    }

    logger.info(`Updated user ${userId} role to ${newRole} in guild ${guildId}`);
    return true;
  } catch (error) {
    logger.error("Error updating role:", error);
    return false;
  }
}

/**
 * Get all members with their roles for a guild
 */
export async function getGuildMembers(
  guildId: string
): Promise<Array<{ userId: string; role: OrganizationRole }>> {
  try {
    // Get all members with roles for this guild
    const members = await prisma.guildRoleMember.findMany({
      where: {
        guildRole: {
          guildId,
        },
        role: { not: null },
      },
      distinct: ['discordId'],
    });

    const result: Array<{ userId: string; role: OrganizationRole }> = [];

    for (const member of members) {
      if (member.role) {
        result.push({
          userId: member.discordId,
          role: member.role as OrganizationRole,
        });
      }
    }

    // Also check for guild owner
    const guild = await db.guild.getGuildById(guildId);
    if (guild?.ownerDiscordId) {
      const ownerExists = result.find(m => m.userId === guild.ownerDiscordId);
      if (!ownerExists) {
        result.push({
          userId: guild.ownerDiscordId,
          role: "owner",
        });
      }
    }

    return result;
  } catch (error) {
    logger.error("Error getting guild members:", error);
    return [];
  }
}

/**
 * Initialize default roles for a guild
 * This ensures the guild has the 3 base roles set up
 */
export async function initializeGuildRoles(
  guildId: string,
  ownerId?: string
): Promise<void> {
  try {
    // Create the organization (guild) if it doesn't exist
    const guild = await db.guild.getGuildById(guildId);
    if (!guild) {
      logger.warn(`Guild ${guildId} not found, cannot initialize roles`);
      return;
    }

    // Set owner if provided
    if (ownerId && guild.ownerDiscordId !== ownerId) {
      await db.guild.updateGuild(guildId, { ownerDiscordId: ownerId });
      logger.info(`Set guild ${guildId} owner to ${ownerId}`);
    }

    logger.info(`Initialized roles for guild ${guildId}`);
  } catch (error) {
    logger.error("Error initializing guild roles:", error);
  }
}