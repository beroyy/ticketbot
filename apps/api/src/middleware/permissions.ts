import type { Context, MiddlewareHandler } from "hono";
import { hasRole, type OrganizationRole } from "@ticketsbot/auth";
import { createLogger } from "../lib/utils/logger";
import { getSessionFromContext, type AuthSession } from "@ticketsbot/auth";

const logger = createLogger("api:permissions");

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

export const validateSession: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  try {
    const session = await getSessionFromContext(c);

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("session", session);
    c.set("user", session.user);

    await next();
    return;
  } catch (error) {
    logger.error("Session validation error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
};

function extractGuildId(c: Context): string | null {
  const paramGuildId = c.req.param("guildId");
  if (paramGuildId) {
    return paramGuildId;
  }

  const panelId = c.req.param("id") || c.req.param("panelId");
  if (panelId && c.req.url.includes("/panels/")) {
    return null;
  }

  return null;
}

/**
 * Role-based permission middleware
 */
export function requireRole(
  roles: OrganizationRole | OrganizationRole[],
  errorMessage?: string
): MiddlewareHandler<{ Variables: Variables }> {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const guildId = extractGuildId(c);

    if (!guildId) {
      c.set("guildId", undefined);
      await next();
      return;
    }

    try {
      const discordId = user.discordUserId;

      if (!discordId) {
        return c.json(
          {
            error: "Please link your Discord account to access guild settings",
            code: "DISCORD_NOT_LINKED",
          },
          403
        );
      }

      const hasRequiredRole = await hasRole(guildId, discordId, roleArray);

      if (!hasRequiredRole) {
        const message = errorMessage || `You need one of these roles: ${roleArray.join(", ")}`;
        return c.json(
          {
            error: message,
            requiredRoles: roleArray,
          },
          403
        );
      }

      c.set("guildId", guildId);
      await next();
      return;
    } catch (error) {
      logger.error("Role check error:", error);
      return c.json({ error: "Failed to verify role" }, 500);
    }
  };
}

export const authenticated = validateSession;