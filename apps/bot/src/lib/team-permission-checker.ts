import { Role } from "@ticketsbot/core/domains";
import { parseDiscordId, PermissionUtils } from "@ticketsbot/core";
import type { PermissionProvider } from "@bot/lib/sapphire-extensions/base-command";

/**
 * Implementation of framework permission interfaces for the tickets bot
 * Uses the Role domain for permission checking
 */
export class TeamPermissionChecker implements PermissionProvider {
  /**
   * Check if a user has a specific permission in a guild
   */
  async hasPermission(userId: string, guildId: string, permission: bigint): Promise<boolean> {
    return Role.hasPermission(parseDiscordId(guildId), parseDiscordId(userId), permission);
  }

  /**
   * Get human-readable permission names for a permission flag
   */
  getPermissionNames(permission: bigint): string[] {
    return PermissionUtils.getPermissionNames(permission);
  }

  /**
   * Get all permissions for a user in a guild
   */
  async getUserPermissions(guildId: string, userId: string): Promise<bigint> {
    return Role.getUserPermissions(parseDiscordId(guildId), parseDiscordId(userId));
  }
}

// Export singleton instance
export const teamPermissionChecker = new TeamPermissionChecker();
