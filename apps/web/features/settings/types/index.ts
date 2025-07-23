export interface TeamRole {
  id: number;
  name: string;
  color: string;
  position: number;
  discordRoleId: string | null;
  isDefault: boolean;
  permissions: string; // BigInt as string
  memberCount: number;
  members?: TeamRoleMember[];
}

export interface TeamRoleMember {
  id: number;
  discordId: string;
  assignedAt: string;
  assignedById: string | null;
  user?: {
    username: string;
    discriminator?: string | null;
    avatarUrl?: string | null;
    displayName: string;
  } | null;
}
