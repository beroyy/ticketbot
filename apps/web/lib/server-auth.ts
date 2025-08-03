import { auth } from "@ticketsbot/core/auth";
import type { IncomingMessage } from "http";
import type { GetServerSidePropsContext } from "next";

export interface ServerSession {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    discordUserId: string | null;
    username: string | null;
    discriminator: string | null;
    avatar_url: string | null;
    image?: string | null;
  };
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}

export async function getServerSession(
  req: IncomingMessage | GetServerSidePropsContext["req"]
): Promise<ServerSession | null> {
  try {
    // Convert IncomingMessage headers to Headers object
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    });

    const session = await auth.api.getSession({ headers });
    return session as ServerSession;
  } catch (error) {
    console.error("Failed to get server session:", error);
    return null;
  }
}

export type AuthState = "loading" | "unauthenticated" | "no-guild" | "authenticated";

export function determineAuthState(
  session: ServerSession | null,
  selectedGuildId: string | null | undefined
): AuthState {
  if (!session) return "unauthenticated";
  if (selectedGuildId === undefined) return "loading";
  if (!selectedGuildId) return "no-guild";
  return "authenticated";
}

export function getSelectedGuildFromCookie(cookies: Record<string, string>): string | null {
  return cookies["ticketsbot-selected-guild"] || null;
}