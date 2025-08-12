import type { Context, Next, MiddlewareHandler } from "hono";
import type { AuthSession } from "@ticketsbot/auth";
import { z } from "zod";
import { ApiContext, PermissionDeniedError } from "../lib/context";
import { createLogger } from "../lib/utils/logger";
import { env } from "../env";
import { nanoid } from "nanoid";

const logger = createLogger("api:context");

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
  requestId: string;
  startTime: number;
};

const sessionCache = new Map<string, { data: any; expires: number }>();

const withAuthContext: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const cookieHeader = c.req.header("cookie");
  if (!cookieHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const cacheKey = cookieHeader;
  const cached = sessionCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    logger.debug("Using cached session validation");
    const sessionData = cached.data;

    if (sessionData) {
      c.set("user", sessionData.user);
      c.set("session", sessionData);

      const guildId = extractGuildId(c);
      if (guildId) {
        c.set("guildId", guildId);
      }

      return ApiContext.provide(
        {
          userId: sessionData.user.id,
          email: sessionData.user.email,
          discordId: sessionData.user.discordUserId || undefined,
          selectedGuildId: guildId,
          permissions: BigInt(sessionData.permissions || 0),
          session: sessionData,
        },
        () => next()
      );
    }
  }

  try {
    const guildId = extractGuildId(c);
    const webUrl = env.WEB_URL || "http://localhost:3000";

    const response = await fetch(`${webUrl}/api/auth/validate-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ guildId }),
    });

    if (!response.ok) {
      logger.debug("Session validation failed", { status: response.status });
      return c.json({ error: "Unauthorized" }, 401);
    }

    const result = (await response.json()) as {
      valid: boolean;
      session?: AuthSession & { permissions: string };
    };
    if (!result.valid || !result.session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sessionData = result.session;

    sessionCache.set(cacheKey, {
      data: sessionData,
      expires: Date.now() + 60 * 1000,
    });

    if (sessionCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of sessionCache.entries()) {
        if (value.expires < now) {
          sessionCache.delete(key);
        }
      }
    }

    logger.debug("Session validated successfully", {
      userId: sessionData.user.id,
      email: sessionData.user.email,
      hasPermissions: !!sessionData.permissions,
    });

    c.set("user", sessionData.user);
    c.set("session", sessionData);

    if (guildId) {
      c.set("guildId", guildId);
    }

    return ApiContext.provide(
      {
        userId: sessionData.user.id,
        email: sessionData.user.email,
        discordId: sessionData.user.discordUserId || undefined,
        selectedGuildId: guildId,
        permissions: BigInt(sessionData.permissions || 0),
        session: sessionData.session,
      },
      () => next()
    );
  } catch (error) {
    logger.error("Session validation error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
};

const extractGuildId = (c: Context): string | undefined => {
  const paramGuildId = c.req.param("guildId");
  if (paramGuildId) {
    const result = z.string().safeParse(paramGuildId);
    if (result.success) {
      return result.data;
    }
    logger.debug("Invalid guild ID in params:", paramGuildId);
    return undefined;
  }

  const query = c.req.query();
  if (query.guildId) {
    const result = z.string().safeParse(query.guildId);
    if (result.success) {
      return result.data;
    }
    logger.debug("Invalid guild ID in query:", query.guildId);
    return undefined;
  }

  return undefined;
};

export const requirePermission = (permission: bigint) => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const checkPermissionAndProceed = async () => {
      try {
        ApiContext.requirePermission(permission);

        if (env.isDev()) {
          const ctx = ApiContext.get();
          logger.debug("Permission check passed", {
            required: permission.toString(16),
            user: ctx.email,
            hasPermission: ApiContext.hasPermission(permission),
          });
        }

        await next();
      } catch (error) {
        if (error instanceof PermissionDeniedError) {
          const response = env.isDev()
            ? {
                error: error.message,
                required: permission.toString(16),
                details: "Missing required permission flag",
              }
            : { error: "Permission denied" };

          c.status(403);
          c.json(response);
          return;
        }
        throw error;
      }
    };

    await checkPermissionAndProceed();
  };
};

export const requestTracking: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  c.set("requestId", nanoid());
  c.set("startTime", Date.now());

  await next();

  const duration = Date.now() - c.get("startTime");
  c.header("X-Request-ID", c.get("requestId"));
  c.header("X-Response-Time", `${duration}ms`);
};

export const middleware = {
  public: [requestTracking] as const,
  authenticated: [requestTracking, withAuthContext] as const,
  guildScoped: [requestTracking, withAuthContext] as const,
} as const;

export const compositions = middleware;
