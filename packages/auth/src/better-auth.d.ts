import "better-auth/client";

declare module "better-auth/client" {
  interface Session {
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      token: string;
      createdAt: Date;
      updatedAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
    };
    user: {
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
    };
  }
}
