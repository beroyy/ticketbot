import { BitField } from "@sapphire/bitfield";
import { PermissionFlags, ALL_PERMISSIONS, type PermissionFlag } from "./constants";

const createBitField = () => new BitField(PermissionFlags);

export const PermissionUtils = {
  hasPermission: (permissions: bigint, flag: bigint): boolean => (permissions & flag) === flag,

  hasAnyPermission: (permissions: bigint, ...flags: bigint[]): boolean =>
    flags.some((flag) => PermissionUtils.hasPermission(permissions, flag)),

  hasAllPermissions: (permissions: bigint, ...flags: bigint[]): boolean =>
    flags.every((flag) => PermissionUtils.hasPermission(permissions, flag)),

  addPermissions: (permissions: bigint, ...flags: bigint[]): bigint =>
    flags.reduce((acc, flag) => acc | flag, permissions),

  removePermissions: (permissions: bigint, ...flags: bigint[]): bigint =>
    flags.reduce((acc, flag) => acc & ~flag, permissions),

  getCumulativePermissions: (permissions: bigint[]): bigint =>
    permissions.reduce((acc, perm) => acc | perm, 0n),

  getIntersection: (...permissions: bigint[]): bigint =>
    permissions.reduce((acc, perm) => acc & perm, ALL_PERMISSIONS),

  getComplement: (permissions: bigint): bigint => ALL_PERMISSIONS & ~permissions,

  getPermissionNames: (permissions: bigint): PermissionFlag[] => {
    const bitfield = createBitField();
    return bitfield.toArray(permissions);
  },

  fromNames: (names: PermissionFlag[]): bigint =>
    names.reduce((acc, name) => acc | PermissionFlags[name], 0n),

  toHexString: (permissions: bigint): string => permissions.toString(16),

  fromHexString: (hex: string): bigint => BigInt(`0x${hex}`),

  getDescription: (flag: bigint): string | undefined => {
    const entry = Object.entries(PermissionFlags).find(([_, value]) => value === flag);
    return entry?.[0]
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  },
} as const;
