
/**
 * Common validation helpers for staff commands
 */
export const StaffHelpers = {
  /**
   * Check if user already has a specific role
   */
  hasRole(userRoles: any[], roleName: string): boolean {
    return userRoles.some((role) => role.name === roleName && role.isDefault);
  },

  /**
   * Get appropriate error message for existing role
   */
  getExistingRoleError(userTag: string, roleName: string): string {
    const messages: Record<string, string> = {
      admin: `${userTag} is already a bot administrator.`,
      support: `${userTag} is already support staff.`,
    };
    return messages[roleName] || `${userTag} already has the ${roleName} role.`;
  },

  /**
   * Get role not found error message
   */
  getRoleNotFoundError(roleName: string): string {
    return `${capitalizeFirst(roleName)} role not found. Please contact support.`;
  },

  /**
   * Format role title for embeds
   */
  formatRoleTitle(roleName: string, action: "added" | "removed"): string {
    const titles: Record<string, Record<string, string>> = {
      admin: {
        added: "Administrator Added",
        removed: "Administrator Removed",
      },
      support: {
        added: "Support Staff Added",
        removed: "Support Staff Removed",
      },
    };
    return titles[roleName]?.[action] || `${capitalizeFirst(roleName)} ${capitalizeFirst(action)}`;
  },

  /**
   * Get role emoji for display
   */
  getRoleEmoji(roleName: string): string {
    const emojis: Record<string, string> = {
      admin: "👑",
      support: "🛠️",
    };
    return emojis[roleName.toLowerCase()] || "👤";
  },
};

const capitalizeFirst = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);
