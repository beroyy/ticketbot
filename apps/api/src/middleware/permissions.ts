import type { Context, Next, MiddlewareHandler } from "hono";
import { Role } from "@ticketsbot/core/domains/role";
import { getPanelGuildId } from "@ticketsbot/core/domains/panel";
import { parseDiscordId, PermissionUtils, createLogger } from "@ticketsbot/core";
import { getSessionFromContext, type AuthSession } from "@ticketsbot/core/auth";

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
    return parseDiscordId(paramGuildId);
  }

  const panelId = c.req.param("id") || c.req.param("panelId");
  if (panelId && c.req.url.includes("/panels/")) {
    return null;
  }

  return null;
}

export function requirePermission(
  permission: bigint,
  errorMessage?: string
): MiddlewareHandler<{ Variables: Variables }> {
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
      await Role.ensureDefaultRoles(guildId);

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

      const effectiveDiscordId = discordId;

      const hasPermission = await Role.hasPermission(
        guildId,
        effectiveDiscordId ?? "dev-user",
        permission
      );

      if (!hasPermission) {
        const message = errorMessage || "You don't have permission to perform this action";
        const permissionNames = PermissionUtils.getPermissionNames(permission);
        return c.json(
          {
            error: message,
            required: permissionNames,
          },
          403
        );
      }

      c.set("guildId", guildId);
      await next();
      return;
    } catch (error) {
      logger.error("Permission check error:", error);
      return c.json({ error: "Failed to verify permissions" }, 500);
    }
  };
}

export function requirePanelPermission(
  permission: bigint,
  errorMessage?: string
): MiddlewareHandler<{ Variables: Variables }> {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    let guildId = extractGuildId(c);

    if (!guildId) {
      const panelId = c.req.param("id") || c.req.param("panelId");
      if (panelId) {
        try {
          const panelGuildId = await getPanelGuildId(parseInt(panelId));

          if (!panelGuildId) {
            return c.json({ error: "Panel not found" }, 404);
          }

          guildId = panelGuildId;
        } catch (_error) {
          return c.json({ error: "Invalid panel ID" }, 400);
        }
      }
    }

    if (!guildId) {
      return c.json({ error: "Guild context required" }, 400);
    }

    try {
      await Role.ensureDefaultRoles(guildId);

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

      const effectiveDiscordId = discordId;

      const hasPermission = await Role.hasPermission(
        guildId,
        effectiveDiscordId ?? "dev-user",
        permission
      );

      if (!hasPermission) {
        const message = errorMessage || "You don't have permission to perform this action";
        const permissionNames = PermissionUtils.getPermissionNames(permission);
        return c.json(
          {
            error: message,
            required: permissionNames,
          },
          403
        );
      }

      c.set("guildId", guildId);
      await next();
      return;
    } catch (error) {
      logger.error("Permission check error:", error);
      return c.json({ error: "Failed to verify permissions" }, 500);
    }
  };
}

export function requireAnyPermission(
  permissions: bigint[],
  errorMessage?: string
): MiddlewareHandler<{ Variables: Variables }> {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
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
      await Role.ensureDefaultRoles(guildId);

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

      const effectiveDiscordId = discordId;

      const hasPermission = await Role.hasAnyPermission(
        guildId,
        effectiveDiscordId ?? "dev-user",
        ...permissions
      );

      if (!hasPermission) {
        const message = errorMessage || "You don't have permission to perform this action";
        const requiredNames = permissions.flatMap((p) => PermissionUtils.getPermissionNames(p));
        return c.json(
          {
            error: message,
            required: requiredNames,
            requiresAny: true,
          },
          403
        );
      }

      c.set("guildId", guildId);
      await next();
      return;
    } catch (error) {
      logger.error("Permission check error:", error);
      return c.json({ error: "Failed to verify permissions" }, 500);
    }
  };
}

export function authenticated(
  permission?: bigint,
  errorMessage?: string
): MiddlewareHandler<{ Variables: Variables }> {
  if (permission) {
    return async (c, next) => {
      await validateSession(c, async () => {
        await requirePermission(permission, errorMessage)(c, next);
      });
    };
  }
  return validateSession;
}
