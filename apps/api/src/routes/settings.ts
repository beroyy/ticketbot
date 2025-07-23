import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { UpdateSettingsSchema } from "@ticketsbot/core/domains/guild";
import { Guild, Team } from "@ticketsbot/core/domains";
import { PermissionFlags } from "@ticketsbot/core";
import { requireAuth, requirePermission } from "../middleware/context";
import type { AuthSession } from "@ticketsbot/core/auth";
import { isErrorWithCode } from "../utils/error-guards";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

export const settings: Hono<{ Variables: Variables }> = new Hono<{ Variables: Variables }>();

// GET /settings/:guildId - Get guild settings with modern structure
settings.get(
  "/:guildId",
  requireAuth,
  requirePermission(PermissionFlags.GUILD_SETTINGS_VIEW),
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");

      // Set guild context
      c.set("guildId", guildId);

      const settings = await Guild.getSettings();
      return c.json(settings);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        const { guildId } = c.req.valid("param");
        // Return default settings for unconfigured guilds
        return c.json({
          id: guildId,
          settings: {
            transcriptsChannel: null,
            logChannel: null,
            defaultTicketMessage: null,
            ticketCategories: [],
            autoCloseTime: null,
            supportRoles: [],
            ticketNameFormat: "ticket-{number}",
            allowUserClose: true,
            threadTickets: false,
            autoThreadArchive: true,
          },
          footer: {
            text: null,
            link: null,
          },
          colors: {
            primary: "#5865F2",
            success: "#57F287",
            error: "#ED4245",
          },
          branding: {
            name: "Support",
            logo: null,
            banner: null,
          },
          tags: [],
          metadata: {
            totalTickets: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }
      console.error("Error fetching guild settings:", error);
      return c.json({ error: "Failed to fetch settings" }, 500);
    }
  }
);

// PUT /settings/:guildId - Update guild settings with modern structure
settings.put(
  "/:guildId",
  requireAuth,
  requirePermission(PermissionFlags.GUILD_SETTINGS_EDIT),
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  zValidator("json", UpdateSettingsSchema),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");
      const input = c.req.valid("json");

      // Set guild context
      c.set("guildId", guildId);

      const updatedSettings = await Guild.updateSettings(input);
      return c.json(updatedSettings);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        return c.json({ error: "Guild not found" }, 404);
      }
      if (isErrorWithCode(error) && error.code === "permission_denied") {
        return c.json({ error: error.message }, 403);
      }
      console.error("Error updating guild settings:", error);
      return c.json({ error: "Failed to update settings" }, 500);
    }
  }
);

// GET /settings/:guildId/team-roles - Get team roles
settings.get(
  "/:guildId/team-roles",
  requireAuth,
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");

      // Set guild context
      c.set("guildId", guildId);

      const roles = await Guild.getTeamRoles();
      return c.json(roles);
    } catch (error) {
      console.error("Error fetching team roles:", error);
      return c.json({ error: "Failed to fetch team roles" }, 500);
    }
  }
);

// GET /settings/:guildId/permissions - Get user permissions for a guild
settings.get(
  "/:guildId/permissions",
  requireAuth,
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");
      const user = c.get("user");

      // Check if user has Discord ID linked
      if (!user.discordUserId) {
        return c.json(
          {
            error: "Discord account not linked",
            permissions: "0",
            roles: [],
          },
          200 // Return 200 with empty permissions instead of error
        );
      }

      // Set guild context
      c.set("guildId", guildId);

      // Get user's permissions and roles
      const [permissions, roles] = await Promise.all([
        Team.getUserPermissions(guildId, user.discordUserId),
        Team.getUserRoles(guildId, user.discordUserId),
      ]);

      // Format response to match frontend expectations
      return c.json({
        permissions: permissions.toString(), // Convert BigInt to string
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          permissions: role.permissions.toString(), // Convert BigInt to string
          discordRoleId: role.discordRoleId,
        })),
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      return c.json({ error: "Failed to fetch permissions" }, 500);
    }
  }
);

// GET /settings/:guildId/blacklist - Get blacklisted users and roles
settings.get(
  "/:guildId/blacklist",
  requireAuth,
  requirePermission(PermissionFlags.MEMBER_BLACKLIST),
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");

      // Set guild context
      c.set("guildId", guildId);

      const blacklist = await Guild.getBlacklist();
      return c.json(blacklist);
    } catch (error) {
      console.error("Error fetching blacklist:", error);
      return c.json({ error: "Failed to fetch blacklist" }, 500);
    }
  }
);

// POST /settings/:guildId/blacklist - Add to blacklist
settings.post(
  "/:guildId/blacklist",
  requireAuth,
  requirePermission(PermissionFlags.MEMBER_BLACKLIST),
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  zValidator(
    "json",
    z.object({
      targetId: z.string(),
      isRole: z.boolean(),
      reason: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");
      const input = c.req.valid("json");

      // Set guild context
      c.set("guildId", guildId);

      const entry = await Guild.addToBlacklist(input);
      return c.json(entry, 201);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "conflict" &&
        "message" in error
      ) {
        return c.json({ error: String(error.message) }, 409);
      }
      console.error("Error adding to blacklist:", error);
      return c.json({ error: "Failed to add to blacklist" }, 500);
    }
  }
);

// DELETE /settings/:guildId/blacklist/:targetId - Remove from blacklist
settings.delete(
  "/:guildId/blacklist/:targetId",
  requireAuth,
  requirePermission(PermissionFlags.MEMBER_UNBLACKLIST),
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
      targetId: z.string(),
    })
  ),
  zValidator(
    "query",
    z.object({
      isRole: z.enum(["true", "false"]).transform((val) => val === "true"),
    })
  ),
  async (c) => {
    try {
      const { guildId, targetId } = c.req.valid("param");
      const { isRole } = c.req.valid("query");

      // Set guild context
      c.set("guildId", guildId);

      const result = await Guild.removeFromBlacklist(targetId, isRole);
      return c.json(result);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        return c.json({ error: error.message }, 404);
      }
      console.error("Error removing from blacklist:", error);
      return c.json({ error: "Failed to remove from blacklist" }, 500);
    }
  }
);

// GET /settings/:guildId/statistics - Get guild statistics
settings.get(
  "/:guildId/statistics",
  requireAuth,
  requirePermission(PermissionFlags.ANALYTICS_VIEW),
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    try {
      const { guildId } = c.req.valid("param");

      // Set guild context
      c.set("guildId", guildId);

      const stats = await Guild.getStatistics();
      return c.json(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return c.json({ error: "Failed to fetch statistics" }, 500);
    }
  }
);
