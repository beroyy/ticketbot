import type { IncomingMessage } from "http";
import { auth } from "@ticketsbot/core/auth";

export type ServerSession = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: string;  // ISO string for serialization
    updatedAt: string;  // ISO string for serialization
    discordUserId: string | null;
    username: string | null;
    discriminator: string | null;
    avatar_url: string | null;
    image?: string | null;
  };
  session: {
    id: string;
    createdAt: string;  // ISO string for serialization
    updatedAt: string;  // ISO string for serialization
    userId: string;
    expiresAt: string;  // ISO string for serialization
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
};

/**
 * Convert Next.js IncomingMessage to Headers for Better Auth
 * Simplified version that just passes the headers
 */
function getHeadersFromRequest(req: IncomingMessage): Headers {
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  });
  return headers;
}

/**
 * Get server session using Better Auth's native API
 * Better Auth handles cookie cache automatically (1 hour cache, then DB fallback)
 */
export async function getServerSession(req: IncomingMessage): Promise<ServerSession | null> {
  try {
    const headers = getHeadersFromRequest(req);
    
    // Use Better Auth's native getSession - it handles cookie cache automatically
    const getSessionFn = auth.api.getSession as (params: {
      headers: Headers;
    }) => Promise<any>;
    
    const sessionData = await getSessionFn({ headers });
    
    if (!sessionData) {
      return null;
    }
    
    // Convert Dates to ISO strings for Next.js serialization
    const session: ServerSession = {
      user: {
        ...sessionData.user,
        createdAt: new Date(sessionData.user.createdAt).toISOString(),
        updatedAt: new Date(sessionData.user.updatedAt).toISOString(),
      },
      session: {
        ...sessionData.session,
        createdAt: new Date(sessionData.session.createdAt).toISOString(),
        updatedAt: new Date(sessionData.session.updatedAt).toISOString(),
        expiresAt: new Date(sessionData.session.expiresAt).toISOString(),
      },
    };
    
    return session;
  } catch (error) {
    console.error("[Auth] Failed to get session:", error);
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
