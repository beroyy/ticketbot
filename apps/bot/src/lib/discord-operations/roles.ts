import type { GuildMember, Guild } from "discord.js";
import { container } from "@sapphire/framework";
import type { Role } from "@ticketsbot/core/domains/role";

export const RoleOps = {
  /**
   * Assign a Discord role to a member with proper error handling
   */
  async assignDiscordRole(member: GuildMember, roleId: string): Promise<boolean> {
    try {
      const role = await member.guild.roles.fetch(roleId);
      if (!role) {
        container.logger.warn(`Discord role ${roleId} not found in guild ${member.guild.id}`);
        return false;
      }

      if (member.roles.cache.has(roleId)) {
        container.logger.debug(`Member ${member.id} already has role ${roleId}`);
        return true;
      }

      await member.roles.add(role);
      container.logger.info(`Assigned Discord role ${roleId} to member ${member.id}`);
      return true;
    } catch (error) {
      container.logger.warn(`Failed to assign Discord role ${roleId}:`, error);
      return false;
    }
  },

  /**
   * Remove a Discord role from a member with proper error handling
   */
  async removeDiscordRole(member: GuildMember, roleId: string): Promise<boolean> {
    try {
      const role = await member.guild.roles.fetch(roleId);
      if (!role) {
        container.logger.warn(`Discord role ${roleId} not found in guild ${member.guild.id}`);
        return false;
      }

      if (!member.roles.cache.has(roleId)) {
        container.logger.debug(`Member ${member.id} doesn't have role ${roleId}`);
        return true;
      }

      await member.roles.remove(role);
      container.logger.info(`Removed Discord role ${roleId} from member ${member.id}`);
      return true;
    } catch (error) {
      container.logger.warn(`Failed to remove Discord role ${roleId}:`, error);
      return false;
    }
  },

  /**
   * Sync a team role to Discord for a specific user
   */
  async syncTeamRoleToDiscord(
    teamRole: Pick<Role.Role, "discordRoleId" | "name">,
    userId: string,
    guild: Guild,
    action: "add" | "remove"
  ): Promise<boolean> {
    if (!teamRole.discordRoleId) {
      container.logger.debug(`Role role ${teamRole.name} has no Discord role ID`);
      return false;
    }

    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        container.logger.debug(`Member ${userId} not found in guild ${guild.id}`);
        return false;
      }

      const roleId = teamRole.discordRoleId.toString();

      if (action === "add") {
        return await this.assignDiscordRole(member, roleId);
      } else {
        return await this.removeDiscordRole(member, roleId);
      }
    } catch (error) {
      container.logger.warn(`Failed to sync team role ${teamRole.name} to Discord:`, error);
      return false;
    }
  },

  /**
   * Sync multiple team roles to Discord for a user
   */
  async syncMultipleRolesToDiscord(
    teamRoles: Array<Pick<Role.Role, "discordRoleId" | "name">>,
    userId: string,
    guild: Guild,
    action: "add" | "remove"
  ): Promise<{ synced: string[]; failed: string[] }> {
    const synced: string[] = [];
    const failed: string[] = [];

    for (const role of teamRoles) {
      const success = await this.syncTeamRoleToDiscord(role, userId, guild, action);
      if (success) {
        synced.push(role.name);
      } else {
        failed.push(role.name);
      }
    }

    return { synced, failed };
  },

  /**
   * Format role permissions for display in embeds
   */
  formatRolePermissions(roleName: string): string {
    const permissions: Record<string, string[]> = {
      admin: [
        "Full access to all bot commands",
        "Can manage roles and permissions",
        "Can configure bot settings",
        "Can manage tickets and panels",
      ],
      support: [
        "Can view and manage all tickets",
        "Can claim and transfer tickets",
        "Can use tag commands",
        "Can view member information",
      ],
    };

    const rolePerms = permissions[roleName.toLowerCase()] || ["Access to team features"];
    return rolePerms.map((perm) => `• ${perm}`).join("\n");
  },
};
