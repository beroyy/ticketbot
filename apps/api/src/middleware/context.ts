import type { Context, Next, MiddlewareHandler } from "hono";
import { type AuthSession, getSessionFromContext } from "@ticketsbot/core/auth";
import { DiscordGuildIdSchema, createLogger } from "@ticketsbot/core";
import { Account } from "@ticketsbot/core/domains/account";
import { User } from "@ticketsbot/core/domains/user";
import { Actor, VisibleError } from "@ticketsbot/core/context";
import { env } from "../env";
import { nanoid } from "nanoid";
import { createHmac } from "crypto";

const logger = createLogger("api:context");

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
  requestId: string;
  startTime: number;
};

if (env.isProd() && !env.apiSecret) {
  logger.error("API_SECRET is not set in production! HMAC authentication will fail.");
  throw new Error("API_SECRET environment variable is required in production");
}

if (env.isDev() && !env.apiSecret) {
  logger.warn("Using default HMAC secret for development. Set API_SECRET for production.");
}

const verifyHmacSignature = (payload: string, signature: string): boolean => {
  const expected = createHmac("sha256", env.apiSecret).update(payload).digest("hex");
  const isValid = signature === expected;

  if (env.isDev()) {
    logger.debug("HMAC signature validation", {
      valid: isValid,
      providedSignature: signature.substring(0, 16) + "...",
      expectedSignature: expected.substring(0, 16) + "...",
      payloadLength: payload.length,
    });
  }

  return isValid;
};

const withHmacContext: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const payloadHeader = c.req.header("X-Auth-Payload");
  const signatureHeader = c.req.header("X-Auth-Signature");

  if (!payloadHeader || !signatureHeader) {
    return withContext(c, next);
  }

  try {
    const payloadStr = Buffer.from(payloadHeader, "base64").toString();

    if (!verifyHmacSignature(payloadStr, signatureHeader)) {
      logger.warn("Invalid HMAC signature");
      return c.json({ error: "Invalid signature" }, 401);
    }

    const payload = JSON.parse(payloadStr);

    if (Date.now() - payload.timestamp > 5 * 60 * 1000) {
      logger.warn("HMAC request expired", {
        timestamp: payload.timestamp,
        age: Date.now() - payload.timestamp,
      });
      return c.json({ error: "Request expired" }, 401);
    }

    const session: AuthSession = {
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name || payload.email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        discordUserId: payload.discordUserId,
        username: payload.username || null,
        discriminator: payload.discriminator || null,
        avatar_url: payload.avatar_url || null,
        image: payload.avatar_url || null,
      },
      session: {
        id: payload.sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: payload.userId,
        expiresAt: new Date(payload.expiresAt),
        token: "",
        ipAddress: null,
        userAgent: null,
      },
    };

    c.set("user", session.user);
    c.set("session", session);

    const guildId = payload.selectedGuildId || extractGuildId(c);
    if (guildId) {
      c.set("guildId", guildId);
    }

    logger.debug("HMAC authentication successful", {
      userId: payload.userId,
      email: payload.email,
      guildId,
      hasPermissions: !!payload.permissions,
    });

    return Actor.provide(
      {
        type: "web_user",
        properties: {
          userId: payload.userId,
          email: payload.email,
          discordId: payload.discordUserId || undefined,
          selectedGuildId: guildId,
          permissions: payload.permissions ? BigInt(payload.permissions) : 0n,
          session,
        },
      },
      () => next()
    );
  } catch (error) {
    logger.error("HMAC authentication failed:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
};

const extractGuildId = (c: Context): string | undefined => {
  const paramGuildId = c.req.param("guildId");
  if (paramGuildId) {
    const result = DiscordGuildIdSchema.safeParse(paramGuildId);
    if (result.success) {
      return result.data;
    }
    logger.debug("Invalid guild ID in params:", paramGuildId);
    return undefined;
  }

  const query = c.req.query();
  if (query.guildId) {
    const result = DiscordGuildIdSchema.safeParse(query.guildId);
    if (result.success) {
      return result.data;
    }
    logger.debug("Invalid guild ID in query:", query.guildId);
    return undefined;
  }

  return undefined;
};

export const withContext: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const session = await getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  logger.debug("Context middleware - session data:", {
    userId: session.user.id,
    email: session.user.email,
    discordUserId: session.user.discordUserId,
    hasDiscordUserId: !!session.user.discordUserId,
    sessionKeys: Object.keys(session.user),
  });

  const guildId = extractGuildId(c);

  let permissions = 0n;
  let effectiveDiscordUserId = session.user.discordUserId;

  if (guildId) {
    if (!effectiveDiscordUserId) {
      logger.debug("No discordUserId in session, checking OAuth account...");
      try {
        const discordAccount = await Account.getDiscordAccount(session.user.id);
        logger.debug("OAuth account lookup result:", {
          found: !!discordAccount,
          accountId: discordAccount?.accountId,
          providerId: discordAccount?.providerId,
          hasAccessToken: !!discordAccount?.accessToken,
        });

        if (discordAccount?.accountId) {
          effectiveDiscordUserId = discordAccount.accountId;
          logger.info(
            `Using Discord ID from OAuth account for user ${session.user.id}: ${effectiveDiscordUserId}`
          );
        } else {
          logger.warn("No Discord account found for user:", session.user.id);
        }
      } catch (error) {
        logger.error("Failed to fetch Discord account as fallback:", error);
      }
    }

    if (effectiveDiscordUserId) {
      try {
        permissions = await User.getPermissions(guildId, effectiveDiscordUserId);
        logger.debug(`Context middleware - calculated permissions:`, {
          guildId,
          discordUserId: effectiveDiscordUserId,
          permissions: permissions.toString(),
          permissionsHex: `0x${permissions.toString(16)}`,
          hasAnyPermission: permissions > 0n,
        });
      } catch (error) {
        logger.error("Failed to get permissions:", error);
      }
    } else {
      logger.warn("No effective Discord user ID available for permission calculation", {
        guildId,
        sessionUserId: session.user.id,
      });
    }
  }

  c.set("user", session.user);
  c.set("session", session);
  if (guildId) {
    c.set("guildId", guildId);
  }

  logger.debug("Creating actor context:", {
    type: "web_user",
    userId: session.user.id,
    email: session.user.email,
    discordId: effectiveDiscordUserId ?? "undefined",
    selectedGuildId: guildId ?? "none",
    permissions: permissions.toString(),
    permissionsHex: `0x${permissions.toString(16)}`,
  });

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

export const requireAuth: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const session = await getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Authentication required" }, 401);
  }

  return withContext(c, next);
};

export const requirePermission = (permission: bigint) => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const checkPermissionAndProceed = async () => {
      try {
        Actor.requirePermission(permission);

        if (env.isDev()) {
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
          const response = env.isDev()
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

    if (!Actor.maybeUse()) {
      await withContext(c, checkPermissionAndProceed);
    } else {
      await checkPermissionAndProceed();
    }
  };
};

export const requireAnyPermission = (...permissions: bigint[]) => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const checkPermissionsAndProceed = async () => {
      try {
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

    if (!Actor.maybeUse()) {
      await withContext(c, checkPermissionsAndProceed);
    } else {
      await checkPermissionsAndProceed();
    }
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
  authenticated: [requestTracking, withHmacContext] as const,
  guildScoped: [requestTracking, withHmacContext] as const,
} as const;

export const compositions = middleware;
