/**
 * Permission utility functions - pure bitwise operations
 * No dependencies on auth, db, or any stateful operations
 */

import { BitField } from "@sapphire/bitfield";
import {
  PermissionFlags,
  ALL_PERMISSIONS,
  DefaultRolePermissions,
  type PermissionFlag,
} from "../schemas/permissions-constants";

// Export for use in other modules
export { ALL_PERMISSIONS, DefaultRolePermissions };

/**
 * Create a BitField instance for internal use
 */
const createBitField = () => new BitField(PermissionFlags);

/**
 * Permission utility functions - functional approach
 */
export const PermissionUtils = {
  /**
   * Check if a permission set includes a specific permission
   */
  hasPermission: (permissions: bigint, flag: bigint): boolean => (permissions & flag) === flag,

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission: (permissions: bigint, ...flags: bigint[]): boolean =>
    flags.some((flag) => PermissionUtils.hasPermission(permissions, flag)),

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions: (permissions: bigint, ...flags: bigint[]): boolean =>
    flags.every((flag) => PermissionUtils.hasPermission(permissions, flag)),

  /**
   * Add permissions to a set
   */
  addPermissions: (permissions: bigint, ...flags: bigint[]): bigint =>
    flags.reduce((acc, flag) => acc | flag, permissions),

  /**
   * Remove permissions from a set
   */
  removePermissions: (permissions: bigint, ...flags: bigint[]): bigint =>
    flags.reduce((acc, flag) => acc & ~flag, permissions),

  /**
   * Get cumulative permissions from multiple sources
   */
  getCumulativePermissions: (permissions: bigint[]): bigint =>
    permissions.reduce((acc, perm) => acc | perm, 0n),

  /**
   * Get intersection of multiple permission sets
   */
  getIntersection: (...permissions: bigint[]): bigint =>
    permissions.reduce((acc, perm) => acc & perm, ALL_PERMISSIONS),

  /**
   * Get complement (inverse) of permissions
   */
  getComplement: (permissions: bigint): bigint => ALL_PERMISSIONS & ~permissions,

  /**
   * Convert permissions to array of flag names
   */
  getPermissionNames: (permissions: bigint): PermissionFlag[] => {
    const bitfield = createBitField();
    return bitfield.toArray(permissions);
  },

  /**
   * Create permissions from flag names
   */
  fromNames: (names: PermissionFlag[]): bigint =>
    names.reduce((acc, name) => acc | PermissionFlags[name], 0n),

  /**
   * Serialize permissions to hex string
   */
  toHexString: (permissions: bigint): string => permissions.toString(16),

  /**
   * Parse permissions from hex string
   */
  fromHexString: (hex: string): bigint => BigInt(`0x${hex}`),

  /**
   * Get human-readable permission descriptions
   */
  getDescription: (flag: bigint): string | undefined => {
    const entry = Object.entries(PermissionFlags).find(([_, value]) => value === flag);
    return entry?.[0]
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  },
} as const;
