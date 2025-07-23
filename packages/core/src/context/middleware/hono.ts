import { Actor, type WebActor } from "../actor";
import { PermissionFlags } from "../../schemas/permissions-constants";

// Type definitions to avoid hono dependency
interface Context {
  req: {
    header: (name: string) => string | undefined;
  };
  json: (data: any, status?: number) => any;
}

type Next = () => Promise<any>;
type MiddlewareHandler = (c: Context, next: Next) => Promise<any>;

/**
 * Hono middleware for providing actor context in API requests
 */
export function actorMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // Get session from auth - this is a placeholder
    const session = await getSession(c);

    if (!session) {
      // No session, continue without context
      return next();
    }

    // Create Web actor
    const actor: WebActor = {
      type: "web_user",
      properties: {
        userId: session.userId,
        email: session.email,
        discordId: session.discordId,
        selectedGuildId: c.req.header("x-guild-id") || session.defaultGuildId,
        permissions: await calculateWebUserPermissions(session, c.req.header("x-guild-id")),
        session,
      },
    };

    // Execute next handler with context
    return Actor.provideAsync(actor, () => next());
  };
}

/**
 * Get session from request
 * This is a placeholder - integrate with your auth system
 */
async function getSession(c: Context): Promise<any> {
  // TODO: Implement actual session retrieval
  // This would typically:
  // 1. Get auth token from headers/cookies
  // 2. Validate token
  // 3. Return session data

  const authHeader = c.req.header("Authorization");
  if (!authHeader) return null;

  // Placeholder implementation
  return {
    userId: "placeholder-user-id",
    email: "user@example.com",
    discordId: "placeholder-discord-id",
    defaultGuildId: null,
  };
}

/**
 * Calculate effective permissions for a web user
 * This is a placeholder - implement based on your permission system
 */
async function calculateWebUserPermissions(_session: any, _guildId?: string): Promise<bigint> {
  // TODO: Implement actual permission calculation
  // This would typically:
  // 1. Query database for user permissions
  // 2. Apply guild-specific permissions if guildId provided
  // 3. Return calculated permissions

  return PermissionFlags.GUILD_SETTINGS_VIEW | PermissionFlags.TICKET_VIEW_ALL;
}

/**
 * Hono middleware to require authentication
 */
export function requireAuth(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    try {
      const actor = Actor.use();
      if (actor.type === "system") {
        // System actors bypass auth
        return next();
      }
    } catch {
      // No actor context
      return c.json({ error: "Authentication required" }, 401);
    }

    return next();
  };
}

/**
 * Hono middleware to require specific permissions
 */
export function requirePermission(permission: bigint): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    try {
      Actor.requirePermission(permission);
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : "Permission denied",
        },
        403
      );
    }

    return next();
  };
}
