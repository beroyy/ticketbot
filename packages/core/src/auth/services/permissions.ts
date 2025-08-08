import { PermissionFlags, PermissionUtils, ALL_PERMISSIONS } from "../..";

export const AuthPermissionUtils = {
  isAdmin: (permissions: bigint): boolean => permissions === ALL_PERMISSIONS,

  hasAdminFlags: (permissions: bigint): boolean =>
    PermissionUtils.hasAnyPermission(
      permissions,
      PermissionFlags.GUILD_SETTINGS_EDIT,
      PermissionFlags.ROLE_CREATE,
      PermissionFlags.ROLE_DELETE
    ),

  canManageTickets: (permissions: bigint): boolean =>
    PermissionUtils.hasAnyPermission(
      permissions,
      PermissionFlags.TICKET_CLOSE_ANY,
      PermissionFlags.TICKET_ASSIGN
    ),

  canViewAllTickets: (permissions: bigint): boolean =>
    PermissionUtils.hasPermission(permissions, PermissionFlags.TICKET_VIEW_ALL),

  canManagePanels: (permissions: bigint): boolean =>
    PermissionUtils.hasAnyPermission(
      permissions,
      PermissionFlags.PANEL_CREATE,
      PermissionFlags.PANEL_EDIT,
      PermissionFlags.PANEL_DELETE
    ),

  getPermissionLevel: (permissions: bigint): string => {
    if (permissions === ALL_PERMISSIONS) return "Admin";
    if (AuthPermissionUtils.hasAdminFlags(permissions)) return "Manager";
    if (AuthPermissionUtils.canManageTickets(permissions)) return "Support";
    if (AuthPermissionUtils.canViewAllTickets(permissions)) return "Viewer";
    return "User";
  },
} as const;
