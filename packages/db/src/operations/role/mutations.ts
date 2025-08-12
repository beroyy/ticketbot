import { prisma } from "../../client";

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
 * Update role with Discord role ID
 */
export const updateRoleDiscordId = async (roleId: number, discordRoleId: string): Promise<void> => {
  await prisma.guildRole.update({
    where: { id: roleId },
    data: { discordRoleId },
  });
};