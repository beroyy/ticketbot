import { BitField } from "@sapphire/bitfield";

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

export const PermissionFlags = {
  PANEL_CREATE: 1n << 0n,
  PANEL_EDIT: 1n << 1n,
  PANEL_DELETE: 1n << 2n,
  PANEL_DEPLOY: 1n << 3n,

  TICKET_VIEW_ALL: 1n << 4n,
  TICKET_CLAIM: 1n << 5n,
  TICKET_CLOSE_ANY: 1n << 6n,
  TICKET_ASSIGN: 1n << 7n,
  TICKET_DELETE: 1n << 8n,
  TICKET_EXPORT: 1n << 9n,

  ROLE_CREATE: 1n << 10n,
  ROLE_EDIT: 1n << 11n,
  ROLE_DELETE: 1n << 12n,
  ROLE_ASSIGN: 1n << 13n,

  MEMBER_VIEW: 1n << 14n,
  MEMBER_BLACKLIST: 1n << 15n,
  MEMBER_UNBLACKLIST: 1n << 28n,

  FORM_CREATE: 1n << 16n,
  FORM_EDIT: 1n << 17n,
  FORM_DELETE: 1n << 18n,

  TAG_CREATE: 1n << 19n,
  TAG_EDIT: 1n << 20n,
  TAG_DELETE: 1n << 21n,
  TAG_USE: 1n << 22n,

  GUILD_SETTINGS_VIEW: 1n << 23n,
  GUILD_SETTINGS_EDIT: 1n << 24n,

  ANALYTICS_VIEW: 1n << 25n,

  FEEDBACK_VIEW: 1n << 26n,
  FEEDBACK_MANAGE: 1n << 27n,
} as const;

export type PermissionFlag = keyof typeof PermissionFlags;

export type PermissionValue = (typeof PermissionFlags)[PermissionFlag];

export const ALL_PERMISSIONS = Object.values(PermissionFlags).reduce((acc, flag) => acc | flag, 0n);

export const DefaultRolePermissions = {
  admin: ALL_PERMISSIONS,
  support:
    PermissionFlags.TICKET_VIEW_ALL |
    PermissionFlags.TICKET_CLAIM |
    PermissionFlags.TICKET_ASSIGN |
    PermissionFlags.TAG_USE |
    PermissionFlags.MEMBER_VIEW,
  viewer:
    PermissionFlags.ANALYTICS_VIEW |
    PermissionFlags.TICKET_VIEW_ALL |
    PermissionFlags.MEMBER_VIEW |
    PermissionFlags.GUILD_SETTINGS_VIEW,
} as const;

export const PermissionCategories = {
  "Panel Management": [
    {
      flag: PermissionFlags.PANEL_CREATE,
      name: "Create Panels",
      description: "Create new ticket panels",
    },
    {
      flag: PermissionFlags.PANEL_EDIT,
      name: "Edit Panels",
      description: "Modify existing panels",
    },
    { flag: PermissionFlags.PANEL_DELETE, name: "Delete Panels", description: "Remove panels" },
    {
      flag: PermissionFlags.PANEL_DEPLOY,
      name: "Deploy Panels",
      description: "Deploy panels to Discord",
    },
  ],
  "Ticket Management": [
    {
      flag: PermissionFlags.TICKET_VIEW_ALL,
      name: "View All Tickets",
      description: "View all tickets in the guild",
    },
    {
      flag: PermissionFlags.TICKET_CLAIM,
      name: "Claim Tickets",
      description: "Claim tickets for handling",
    },
    {
      flag: PermissionFlags.TICKET_CLOSE_ANY,
      name: "Close Any Ticket",
      description: "Close tickets opened by others",
    },
    {
      flag: PermissionFlags.TICKET_ASSIGN,
      name: "Assign Tickets",
      description: "Assign tickets to other staff",
    },
    {
      flag: PermissionFlags.TICKET_DELETE,
      name: "Delete Tickets",
      description: "Permanently delete tickets",
    },
    {
      flag: PermissionFlags.TICKET_EXPORT,
      name: "Export Tickets",
      description: "Export ticket transcripts",
    },
  ],
  "Role Management": [
    {
      flag: PermissionFlags.ROLE_CREATE,
      name: "Create Roles",
      description: "Create new team roles",
    },
    { flag: PermissionFlags.ROLE_EDIT, name: "Edit Roles", description: "Modify role permissions" },
    { flag: PermissionFlags.ROLE_DELETE, name: "Delete Roles", description: "Remove team roles" },
    {
      flag: PermissionFlags.ROLE_ASSIGN,
      name: "Assign Roles",
      description: "Assign roles to team members",
    },
  ],
  "Member Management": [
    {
      flag: PermissionFlags.MEMBER_VIEW,
      name: "View Members",
      description: "View team member list",
    },
    {
      flag: PermissionFlags.MEMBER_BLACKLIST,
      name: "Blacklist Users",
      description: "Add users to blacklist",
    },
    {
      flag: PermissionFlags.MEMBER_UNBLACKLIST,
      name: "Unblacklist Users",
      description: "Remove users from blacklist",
    },
  ],
  "Form Management": [
    { flag: PermissionFlags.FORM_CREATE, name: "Create Forms", description: "Create ticket forms" },
    { flag: PermissionFlags.FORM_EDIT, name: "Edit Forms", description: "Modify existing forms" },
    { flag: PermissionFlags.FORM_DELETE, name: "Delete Forms", description: "Remove forms" },
  ],
  "Tag Management": [
    { flag: PermissionFlags.TAG_CREATE, name: "Create Tags", description: "Create support tags" },
    { flag: PermissionFlags.TAG_EDIT, name: "Edit Tags", description: "Modify existing tags" },
    { flag: PermissionFlags.TAG_DELETE, name: "Delete Tags", description: "Remove tags" },
    {
      flag: PermissionFlags.TAG_USE,
      name: "Use Tags",
      description: "Use tags in ticket responses",
    },
  ],
  "Settings & Analytics": [
    {
      flag: PermissionFlags.GUILD_SETTINGS_VIEW,
      name: "View Settings",
      description: "View guild settings",
    },
    {
      flag: PermissionFlags.GUILD_SETTINGS_EDIT,
      name: "Edit Settings",
      description: "Modify guild settings",
    },
    {
      flag: PermissionFlags.ANALYTICS_VIEW,
      name: "View Analytics",
      description: "Access analytics dashboard",
    },
    {
      flag: PermissionFlags.FEEDBACK_VIEW,
      name: "View Feedback",
      description: "View ticket feedback",
    },
    {
      flag: PermissionFlags.FEEDBACK_MANAGE,
      name: "Manage Feedback",
      description: "Export and manage feedback",
    },
  ],
} as const;
