import { getCookie } from "hono/cookie";
import { auth, type AuthSession } from "@ticketsbot/core/auth";
import { Actor } from "@ticketsbot/core/context";
import { User, Redis } from "@ticketsbot/core";
import { factory, ApiErrors, parseGuildId } from "../factory";
import { nanoid } from "nanoid";

/**
 * Request tracking middleware - adds requestId and timing
 */
export const requestMiddleware = factory.createMiddleware(async (c, next) => {
  c.set("requestId", nanoid());
  c.set("startTime", Date.now());

  await next();

  const duration = Date.now() - c.get("startTime");
  c.header("X-Request-ID", c.get("requestId"));
  c.header("X-Response-Time", `${duration}ms`);
});

/**
 * CORS middleware with proper configuration
 */
export const corsMiddleware = factory.createMiddleware(async (c, next) => {
  const origin = c.req.header("Origin") ?? "*";

  // In production, validate against allowed origins
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? ["https://ticketsbot.net", "https://app.ticketsbot.net"]
      : ["http://localhost:9000", "http://localhost:9001"];

  const isAllowed = allowedOrigins.some((allowed) => origin === allowed || origin === "*");

  if (isAllowed) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  return await next();
});

/**
 * Authentication middleware - validates session and sets user context
 */
export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const sessionId = getCookie(c, "ticketsbot-session");

  if (!sessionId) {
    throw ApiErrors.unauthorized("No session cookie");
  }

  const headers = new Headers();
  const cookieHeader = c.req.raw.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const sessionData = (await auth.api.getSession({
    headers,
  })) as any; // Type assertion needed due to auth library typing

  if (!sessionData) {
    throw ApiErrors.unauthorized("Invalid session");
  }

  // The session data from better-auth has both session and user properties
  const session = sessionData as AuthSession;

  // Set variables for downstream middleware
  c.set("session", session);
  c.set("user", session.user);

  // Initialize Actor context using Actor.provide (not Actor.with)
  return Actor.provide(
    {
      type: "web_user",
      properties: {
        userId: session.user.id,
        email: session.user.email,
        discordId: session.user.discordUserId ?? undefined,
        selectedGuildId: undefined, // Will be set by guildContextMiddleware
        permissions: 0n, // Will be set by guildContextMiddleware
        session,
      },
    },
    async () => {
      await next();
    }
  );
});

/**
 * Guild context middleware - validates guild access and sets context
 */
export const guildContextMiddleware = factory.createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    throw ApiErrors.unauthorized("User not authenticated");
  }

  // Try to get guildId from various sources
  let guildIdStr: string | undefined;

  // 1. From path params
  const param = c.req.param("guildId");
  if (param) {
    guildIdStr = param;
  }

  // 2. From query params
  if (!guildIdStr) {
    const query = c.req.query("guildId");
    if (query) {
      guildIdStr = query;
    }
  }

  // 3. From request body (for POST/PUT)
  if (!guildIdStr && (c.req.method === "POST" || c.req.method === "PUT")) {
    try {
      const body = await c.req.json();
      if (body && typeof body === "object" && "guildId" in body) {
        guildIdStr = String(body.guildId);
      }
    } catch {
      // Body might not be JSON or might be consumed already
    }
  }

  if (!guildIdStr) {
    throw ApiErrors.badRequest("Guild ID is required");
  }

  // Validate the guild ID format
  parseGuildId(guildIdStr);

  // Verify the user has access to this guild by checking they're in it
  // Import findById from guild domain
  const { findById } = await import("@ticketsbot/core/domains/guild");
  const guild = await findById(guildIdStr);

  if (!guild) {
    throw ApiErrors.notFound("Guild");
  }

  // Get user's permissions in this guild
  const permissions = await User.getPermissions(guildIdStr, user.discordUserId || "");

  // Set guild context
  c.set("guildId", guildIdStr);
  c.set("guild", guild);

  // Update Actor context with guild and permissions
  return Actor.provide(
    {
      type: "web_user",
      properties: {
        userId: user.id,
        email: user.email,
        discordId: user.discordUserId ?? undefined,
        selectedGuildId: guildIdStr,
        permissions,
        session: c.get("session"),
      },
    },
    async () => {
      await next();
    }
  );
});

/**
 * Rate limiting middleware with Redis (when available)
 */
export const rateLimitMiddleware = factory.createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    throw ApiErrors.unauthorized();
  }

  // Check for Redis availability
  if (!Redis.isAvailable()) {
    // Redis not available, skip rate limiting
    await next();
    return;
  }

  const key = `rate:${user.id}:${c.req.path}`;
  const limit = 100; // requests per minute

  try {
    const client = await Redis.getClient();
    if (!client) {
      // Redis not available, skip rate limiting
      await next();
      return;
    }
    const count = await client.incr(key);

    if (count === 1) {
      await client.expire(key, 60); // 1 minute
    }

    if (count > limit) {
      throw ApiErrors.rateLimit();
    }

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
  } catch (error) {
    // If Redis fails, log but don't block the request
    console.error("Rate limit check failed:", error);
  }

  await next();
});

/**
 * Permission check middleware factory
 */
export const requirePermission = (permission: bigint) => {
  return factory.createMiddleware(async (c, next) => {
    const actor = Actor.maybeUse();
    if (!actor) {
      throw ApiErrors.unauthorized("No actor context");
    }

    if (!Actor.hasPermission(permission)) {
      throw ApiErrors.forbidden(`Missing required permission: ${permission.toString(16)}`);
    }

    await next();
  });
};

/**
 * Multiple permission check (requires ALL)
 */
export const requirePermissions = (...permissions: bigint[]) => {
  return factory.createMiddleware(async (c, next) => {
    const actor = Actor.maybeUse();
    if (!actor) {
      throw ApiErrors.unauthorized("No actor context");
    }

    for (const permission of permissions) {
      if (!Actor.hasPermission(permission)) {
        throw ApiErrors.forbidden(`Missing required permission: ${permission.toString(16)}`);
      }
    }

    await next();
  });
};

/**
 * Any permission check (requires at least ONE)
 */
export const requireAnyPermission = (...permissions: bigint[]) => {
  return factory.createMiddleware(async (c, next) => {
    const actor = Actor.maybeUse();
    if (!actor) {
      throw ApiErrors.unauthorized("No actor context");
    }

    const hasAny = permissions.some((p) => Actor.hasPermission(p));
    if (!hasAny) {
      throw ApiErrors.forbidden("Missing any of the required permissions");
    }

    await next();
  });
};

/**
 * Rate limit presets for common use cases
 */
export enum RateLimitPreset {
  STRICT = 10,
  NORMAL = 60,
  RELAXED = 120,
  PUBLIC = 30,
}

/**
 * Common middleware compositions for routes
 */
export const compositions = {
  /**
   * Public endpoints - no auth required
   */
  public: [requestMiddleware, corsMiddleware],

  /**
   * Authenticated endpoints - require valid session
   */
  authenticated: [requestMiddleware, corsMiddleware, authMiddleware],

  /**
   * Guild-scoped endpoints - require guild context
   */
  guildScoped: [requestMiddleware, corsMiddleware, authMiddleware, guildContextMiddleware],

  /**
   * Rate-limited endpoints
   */
  rateLimited: [requestMiddleware, corsMiddleware, authMiddleware, rateLimitMiddleware],
} as const;
