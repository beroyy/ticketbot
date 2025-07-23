/**
 * Type definitions for Better Auth
 * These match the configuration in auth-config.ts
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  username?: string | null;
  discriminator?: string | null;
  avatar_url?: string | null;
  discordUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Extended session type with Discord integration
// Note: Discord user details must be fetched separately
// as Better Auth doesn't support complex objects in additional fields
export interface AuthSession {
  session: Session;
  user: User & {
    discordUserId: string | null;
  };
}
