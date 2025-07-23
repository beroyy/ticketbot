import { Team } from "@ticketsbot/core/domains";
import { parseDiscordId, PermissionUtils } from "@ticketsbot/core";
import type { PermissionProvider } from "@bot/lib/sapphire-extensions/base-command";

/**
 * Implementation of framework permission interfaces for the tickets bot
 * Uses the Team domain for permission checking
 */
export class TeamPermissionChecker implements PermissionProvider {
  /**
   * Check if a user has a specific permission in a guild
   */
  async hasPermission(userId: string, guildId: string, permission: bigint): Promise<boolean> {
    return Team.hasPermission(parseDiscordId(guildId), parseDiscordId(userId), permission);
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
    return Team.getUserPermissions(parseDiscordId(guildId), parseDiscordId(userId));
  }
}

// Export singleton instance
export const teamPermissionChecker = new TeamPermissionChecker();
