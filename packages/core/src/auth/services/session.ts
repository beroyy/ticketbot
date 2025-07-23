import { auth } from "../auth";
import type { AuthSession } from "../types";
import type { Context } from "hono";
import { logger } from "../utils/logger";

/**
 * Get session from Better Auth using the request
 * This replaces manual session validation
 */
export async function getSession(request: Request): Promise<AuthSession | null> {
  try {
    // Use Better Auth's built-in session retrieval
    const getSessionFn = auth.api.getSession as (params: {
      headers: Headers;
    }) => Promise<AuthSession | null>;
    const session = await getSessionFn({
      headers: request.headers,
    });

    if (!session) {
      return null;
    }

    // Session is automatically validated by Better Auth
    // Including expiration checks and cookie verification
    // Discord fields are populated via hooks
    return session;
  } catch (error) {
    logger.error("Failed to get session:", error);
    return null;
  }
}

/**
 * Get session from Hono context
 */
export async function getSessionFromContext(c: Context): Promise<AuthSession | null> {
  return getSession(c.req.raw);
}

/**
 * Validate session and return it
 * Throws an error if session is invalid
 */
export async function requireSession(request: Request): Promise<AuthSession> {
  const session = await getSession(request);

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
