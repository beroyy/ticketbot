import type { Context, Next, MiddlewareHandler } from "hono";
import { auth } from "@ticketsbot/auth";
import { z } from "zod";
import { ApiContext, RoleDeniedError } from "../lib/context";
import { createLogger } from "../lib/utils/logger";
import { env } from "../env";
import { nanoid } from "nanoid";

const logger = createLogger("api:context");

type Variables = {
  user: any;
  session: any;
  guildId?: string;
  requestId: string;
  startTime: number;
};

const withAuthContext: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  try {
    // Use Better Auth's getSession directly with Hono request headers
    const sessionData = await auth.api.getSession({ 
      headers: c.req.raw.headers 
    });

    if (!sessionData) {
      logger.debug("No session found");
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Type guard to ensure we have a valid session
    if (!sessionData || typeof sessionData !== "object" || !("user" in sessionData)) {
      logger.debug("Invalid session data");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const session = sessionData as any;

    logger.debug("Session validated successfully", {
      userId: session.user.id,
      email: session.user.email,
    });

    c.set("user", session.user);
    c.set("session", session);

    const guildId = extractGuildId(c);
    if (guildId) {
      c.set("guildId", guildId);
    }

    return ApiContext.provide(
      {
        userId: session.user.id,
        email: session.user.email,
        discordId: session.user.discordUserId || undefined,
        selectedGuildId: guildId,
        session: session.session,
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

export const requireRole = (role: string | string[]) => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const checkRoleAndProceed = async () => {
      try {
        ApiContext.requireRole(role);

        if (env.isDev()) {
          const ctx = ApiContext.get();
          logger.debug("Role check passed", {
            required: role,
            user: ctx.email,
            hasRole: ApiContext.hasRole(role),
          });
        }

        await next();
      } catch (error) {
        if (error instanceof RoleDeniedError) {
          const response = env.isDev()
            ? {
                error: error.message,
                required: role,
                details: "Missing required role",
              }
            : { error: "Access denied" };

          c.status(403);
          c.json(response);
          return;
        }
        throw error;
      }
    };

    await checkRoleAndProceed();
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
