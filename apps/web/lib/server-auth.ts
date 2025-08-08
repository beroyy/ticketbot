import type { IncomingMessage } from "http";

export type ServerSession = {
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
};

export async function getServerSession(req: IncomingMessage): Promise<ServerSession | null> {
  try {
    if (!req.headers.cookie) {
      return null;
    }

    const cookies = req.headers.cookie.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const sessionDataCookie = cookies["session_data"];

    // Check if we have the session_data cookie
    if (!sessionDataCookie) {
      return null;
    }

    try {
      // Decode the base64 encoded session data
      const decodedSessionData = Buffer.from(sessionDataCookie, "base64").toString("utf-8");
      const sessionData = JSON.parse(decodedSessionData);

      // Check if session is expired (expiresAt is in milliseconds)
      if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
        return null;
      }

      // Return the session in the expected format
      // The session_data cookie has a nested structure: { session: { user: {...}, session: {...} } }
      if (sessionData.session?.user && sessionData.session?.session) {
        return {
          user: sessionData.session.user,
          session: sessionData.session.session,
        } as ServerSession;
      }

      return null;
    } catch (error) {
      // Failed to parse session data
      return null;
    }
  } catch (error) {
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
