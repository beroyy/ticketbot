import { auth } from "../auth";
import type { AuthSession } from "../types";
import type { Context } from "hono";
import { logger } from "../utils/logger";

export async function getSession(request: Request): Promise<AuthSession | null> {
  try {
    if (process.env.NODE_ENV === "development") {
      const cookies = request.headers.get("cookie");
      logger.debug("Getting session", {
        hasCookies: !!cookies,
        cookieCount: cookies ? cookies.split(";").length : 0,
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer"),
      });
    }

    const getSessionFn = auth.api.getSession as (params: {
      headers: Headers;
    }) => Promise<AuthSession | null>;
    const session = await getSessionFn({
      headers: request.headers,
    });

    if (!session) {
      logger.debug("No session found");
      return null;
    }

    if (process.env.NODE_ENV === "development") {
      logger.debug("Session found", {
        userId: session.user.id,
        email: session.user.email,
        discordUserId: session.user.discordUserId,
        sessionId: session.session.id,
        expiresAt: session.session.expiresAt,
      });
    }

    return session;
  } catch (error) {
    logger.error("Failed to get session:", error);
    return null;
  }
}

export async function getSessionFromContext(c: Context): Promise<AuthSession | null> {
  return getSession(c.req.raw);
}

export async function requireSession(request: Request): Promise<AuthSession> {
  const session = await getSession(request);

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
