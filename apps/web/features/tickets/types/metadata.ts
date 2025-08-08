export interface UserMetadata {
  displayName?: string;
  accountAgeInDays?: number;
  accountCreatedAt?: string;
  guilds?: Record<string, GuildMetadata>;
}

export interface GuildMetadata {
  joinedAt?: string;
  serverAgeInDays?: number;
  isBooster?: boolean;
  premiumSince?: string;
  nickname?: string;
  roles?: RoleMetadata[];
}

export interface RoleMetadata {
  id: string;
  name: string;
  color: string;
}

// Type guard functions
export function isUserMetadata(obj: unknown): obj is UserMetadata {
  return obj !== null && typeof obj === "object" && "displayName" in obj;
}

export function hasGuildData(metadata: UserMetadata): metadata is UserMetadata & {
  guilds: Record<string, GuildMetadata>;
} {
  return metadata.guilds !== undefined && Object.keys(metadata.guilds).length > 0;
}
