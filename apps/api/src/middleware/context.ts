import type { Context, Next, MiddlewareHandler } from "hono";
import { type AuthSession, getSessionFromContext } from "@ticketsbot/core/auth";
import { User, DiscordGuildIdSchema } from "@ticketsbot/core";
import { Account } from "@ticketsbot/core/domains";
import { Actor, VisibleError } from "@ticketsbot/core/context";
import { env, isDevelopment } from "../env";
import { logger } from "../utils/logger";
import { nanoid } from "nanoid";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
  requestId: string;
  startTime: number;
};

/**
 * Extract guild ID from various sources in the request
 * Now uses Zod validation for better error handling
 */
const extractGuildId = (c: Context): string | undefined => {
  // Try URL params first (e.g., /guilds/:guildId/...)
  const paramGuildId = c.req.param("guildId");
  if (paramGuildId) {
    const result = DiscordGuildIdSchema.safeParse(paramGuildId);
    if (result.success) {
      return result.data;
    }
    logger.debug("Invalid guild ID in params:", paramGuildId);
    return undefined;
  }

  // Try query params
  const query = c.req.query();
  if (query.guildId) {
    const result = DiscordGuildIdSchema.safeParse(query.guildId);
    if (result.success) {
      return result.data;
    }
    logger.debug("Invalid guild ID in query:", query.guildId);
    return undefined;
  }

  // For POST/PUT/PATCH, we could check body, but that requires parsing
  // which should be done by the route handler with proper validation

  return undefined;
};

/**
 * Development mode permission override
 */
const getDevPermissions = (): bigint | undefined => {
  if (isDevelopment() && env.DEV_PERMISSIONS_HEX) {
    try {
      const permissions = BigInt(env.DEV_PERMISSIONS_HEX);
      logger.debug("🔧 DEV MODE: Using permission override", permissions.toString(16));
      return permissions;
    } catch (e) {
      logger.error("Invalid DEV_PERMISSIONS_HEX value:", e);
    }
  }
  return undefined;
};

/**
 * Context middleware that provides actor context for the entire request
 */
export const withContext: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const session = await getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Extract guild ID from request
  const guildId = extractGuildId(c);

  // Calculate permissions
  let permissions = 0n;
  let effectiveDiscordUserId = session.user.discordUserId;

  if (guildId) {
    // If discordUserId not in session, fallback to OAuth account
    if (!effectiveDiscordUserId) {
      try {
        const discordAccount = await Account.getDiscordAccount(session.user.id);
        if (discordAccount?.accountId) {
          effectiveDiscordUserId = discordAccount.accountId;
          logger.debug(`Using Discord ID from OAuth account for user ${session.user.id}: ${effectiveDiscordUserId}`);
        }
      } catch (error) {
        logger.warn("Failed to fetch Discord account as fallback:", error);
      }
    }

    if (effectiveDiscordUserId) {
      try {
        // Check for dev override first
        const devPermissions = getDevPermissions();
        if (devPermissions !== undefined) {
          permissions = devPermissions;
        } else {
          permissions = await User.getPermissions(guildId, effectiveDiscordUserId);
          logger.debug(`Context middleware - calculated permissions for user ${effectiveDiscordUserId} in guild ${guildId}: ${permissions.toString()}`);
        }
      } catch (error) {
        logger.error("Failed to get permissions:", error);
        // Continue with no permissions rather than failing the request
      }
    }
  }

  // Also set Hono variables for backward compatibility during migration
  c.set("user", session.user);
  c.set("session", session);
  if (guildId) {
    c.set("guildId", guildId);
  }

  // Provide actor context for the entire request
  return Actor.provide(
    {
      type: "web_user",
      properties: {
        userId: session.user.id,
        email: session.user.email,
        discordId: effectiveDiscordUserId ?? undefined,
        selectedGuildId: guildId,
        permissions,
        session,
      },
    },
    () => next()
  );
};

/**
 * Middleware that requires authentication (wraps withContext)
 */
export const requireAuth: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const session = await getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Authentication required" }, 401);
  }

  return withContext(c, next);
};

/**
 * Higher-order middleware factory for permission checks
 * Now includes better logging and error details
 */
export const requirePermission = (permission: bigint) => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const checkPermissionAndProceed = async () => {
      try {
        Actor.requirePermission(permission);

        // Log successful permission check in dev
        if (isDevelopment()) {
          const actor = Actor.use();
          logger.debug("Permission check passed", {
            required: permission.toString(16),
            user: actor.type === "web_user" ? actor.properties.email : "unknown",
            hasPermission: Actor.hasPermission(permission),
          });
        }

        await next();
      } catch (error) {
        if (error instanceof VisibleError) {
          // Enhanced error response with permission details in dev
          const response = isDevelopment()
            ? {
                error: error.message,
                code: error.code,
                required: permission.toString(16),
                details: "Missing required permission flag",
              }
            : { error: error.message, code: error.code };

          c.status(403);
          c.json(response);
          return;
        }
        throw error;
      }
    };

    // Ensure we have context
    if (!Actor.maybeUse()) {
      await withContext(c, checkPermissionAndProceed);
    } else {
      await checkPermissionAndProceed();
    }
  };
};

/**
 * Higher-order middleware factory for any-of permission checks
 */
export const requireAnyPermission = (...permissions: bigint[]) => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const checkPermissionsAndProceed = async () => {
      try {
        // Check if user has any of the specified permissions
        const hasAny = permissions.some((p) => Actor.hasPermission(p));
        if (!hasAny) {
          throw new VisibleError("permission_denied", "Missing required permissions");
        }
        await next();
      } catch (error) {
        if (error instanceof VisibleError) {
          c.status(403);
          c.json({ error: error.message, code: error.code });
          return;
        }
        throw error;
      }
    };

    // Ensure we have context
    if (!Actor.maybeUse()) {
      await withContext(c, checkPermissionsAndProceed);
    } else {
      await checkPermissionsAndProceed();
    }
  };
};

/**
 * Request tracking middleware - adds requestId and timing
 */
export const requestTracking: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  c.set("requestId", nanoid());
  c.set("startTime", Date.now());

  await next();

  const duration = Date.now() - c.get("startTime");
  c.header("X-Request-ID", c.get("requestId"));
  c.header("X-Response-Time", `${duration}ms`);
};

/**
 * Middleware compositions for common patterns
 * These replace the old compositions from factory-middleware.ts
 */
export const middleware = {
  /**
   * Public endpoints - no auth required
   */
  public: [requestTracking] as const,

  /**
   * Authenticated endpoints - require valid session
   * withContext automatically extracts guild ID if present
   */
  authenticated: [requestTracking, withContext] as const,

  /**
   * Guild-scoped endpoints - same as authenticated in new system
   * withContext automatically extracts guild ID from params/query
   */
  guildScoped: [requestTracking, withContext] as const,
} as const;

/**
 * Backward compatibility export for easier migration
 * Maps old names to new middleware
 */
export const compositions = middleware;
