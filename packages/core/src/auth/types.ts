export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  discordUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  // Discord data is provided by session enhancement plugin but not stored in DB
  username?: string | null;
  discriminator?: string | null;
  avatar_url?: string | null;
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
