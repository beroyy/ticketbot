/**
 * Permission business logic for authorization
 * These functions use the core permission utilities for auth-specific operations
 */

import { PermissionFlags, PermissionUtils, ALL_PERMISSIONS } from "../..";

/**
 * Auth-specific permission helpers that build on core utilities
 */
export const AuthPermissionUtils = {
  /**
   * Check if permissions are admin level
   */
  isAdmin: (permissions: bigint): boolean => permissions === ALL_PERMISSIONS,

  /**
   * Check if permissions include any admin flags
   */
  hasAdminFlags: (permissions: bigint): boolean =>
    PermissionUtils.hasAnyPermission(
      permissions,
      PermissionFlags.GUILD_SETTINGS_EDIT,
      PermissionFlags.ROLE_CREATE,
      PermissionFlags.ROLE_DELETE
    ),

  /**
   * Check if user can manage tickets
   */
  canManageTickets: (permissions: bigint): boolean =>
    PermissionUtils.hasAnyPermission(
      permissions,
      PermissionFlags.TICKET_CLOSE_ANY,
      PermissionFlags.TICKET_ASSIGN
    ),

  /**
   * Check if user can view all tickets
   */
  canViewAllTickets: (permissions: bigint): boolean =>
    PermissionUtils.hasPermission(permissions, PermissionFlags.TICKET_VIEW_ALL),

  /**
   * Check if user can manage panels
   */
  canManagePanels: (permissions: bigint): boolean =>
    PermissionUtils.hasAnyPermission(
      permissions,
      PermissionFlags.PANEL_CREATE,
      PermissionFlags.PANEL_EDIT,
      PermissionFlags.PANEL_DELETE
    ),

  /**
   * Get permission level name
   */
  getPermissionLevel: (permissions: bigint): string => {
    if (permissions === ALL_PERMISSIONS) return "Admin";
    if (AuthPermissionUtils.hasAdminFlags(permissions)) return "Manager";
    if (AuthPermissionUtils.canManageTickets(permissions)) return "Support";
    if (AuthPermissionUtils.canViewAllTickets(permissions)) return "Viewer";
    return "User";
  },
} as const;
