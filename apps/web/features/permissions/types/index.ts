export interface UserPermissions {
  guildId: string;
  permissions: bigint;
  roles: {
    id: number;
    name: string;
    permissions: bigint;
  }[];
}

export interface PermissionsResponse {
  permissions: string;
  roles: Array<{
    id: number;
    name: string;
    permissions: string;
  }>;
}
