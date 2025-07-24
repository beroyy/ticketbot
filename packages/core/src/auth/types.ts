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

export interface AuthSession {
  session: Session;
  user: User & {
    discordUserId: string | null;
  };
}
