import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema, PermissionFlags } from "@ticketsbot/core";
import { UpdateSettingsSchema } from "@ticketsbot/core/domains/guild";
import { Guild, Role } from "@ticketsbot/core/domains";
import { createRoute, ApiErrors } from "../factory";
import { compositions, requirePermission } from "../middleware/context";

// Default settings for unconfigured guilds
const defaultSettings = (guildId: string) => ({
  id: guildId,
  settings: {
    transcriptsChannel: null,
    logChannel: null,
    defaultTicketMessage: null,
    ticketCategories: [],
    supportRoles: [],
    ticketNameFormat: "ticket-{number}",
    allowUserClose: true,
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

// Create settings routes using method chaining
export const settingsRoutes = createRoute()
  // Get guild settings
  .get(
    "/:guildId",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    requirePermission(PermissionFlags.GUILD_SETTINGS_VIEW),
    async (c) => {
      const { guildId } = c.req.valid("param");

      try {
        const settings = await Guild.getSettings();
        return c.json(settings);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          // Return default settings for unconfigured guilds
          return c.json(defaultSettings(guildId));
        }
        throw error;
      }
    }
  )

  // Update guild settings
  .put(
    "/:guildId",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    zValidator("json", UpdateSettingsSchema),
    requirePermission(PermissionFlags.GUILD_SETTINGS_EDIT),
    async (c) => {
      // Guild ID is extracted from params by context middleware
      const input = c.req.valid("json");

      try {
        const updatedSettings = await Guild.updateSettings(input);
        return c.json(updatedSettings);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Guild");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
          }
        }
        throw error;
      }
    }
  )

  // Get team roles
  .get(
    "/:guildId/team-roles",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    async (c) => {
      // Guild ID is extracted from params by context middleware
      const roles = await Guild.getTeamRoles();
      return c.json(roles);
    }
  )

  // Get user permissions for a guild
  .get(
    "/:guildId/permissions",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    async (c) => {
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
          200
        ); // Return 200 with empty permissions
      }

      // Get user's permissions and roles in parallel
      const [permissions, roles] = await Promise.all([
        Role.getUserPermissions(guildId, user.discordUserId),
        Role.getUserRoles(guildId, user.discordUserId),
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
    }
  )

  // Get blacklisted users and roles
  .get(
    "/:guildId/blacklist",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    requirePermission(PermissionFlags.MEMBER_BLACKLIST),
    async (c) => {
      // Guild ID is extracted from params by context middleware
      const blacklist = await Guild.getBlacklist();
      return c.json(blacklist);
    }
  )

  // Add to blacklist
  .post(
    "/:guildId/blacklist",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    zValidator(
      "json",
      z.object({
        targetId: z.string(),
        isRole: z.boolean(),
        reason: z.string().optional(),
      })
    ),
    requirePermission(PermissionFlags.MEMBER_BLACKLIST),
    async (c) => {
      // Guild ID is extracted from params by context middleware
      const input = c.req.valid("json");

      try {
        const entry = await Guild.addToBlacklist(input);
        return c.json(entry, 201);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "conflict") {
          throw ApiErrors.conflict(String((error as any).message || "Already blacklisted"));
        }
        throw error;
      }
    }
  )

  // Remove from blacklist
  .delete(
    "/:guildId/blacklist/:targetId",
    ...compositions.authenticated,
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
    requirePermission(PermissionFlags.MEMBER_UNBLACKLIST),
    async (c) => {
      // Guild ID is extracted from params by context middleware
      const { targetId } = c.req.valid("param");
      const { isRole } = c.req.valid("query");

      try {
        const result = await Guild.removeFromBlacklist(targetId, isRole);
        return c.json(result);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound(String((error as any).message || "Blacklist entry"));
        }
        throw error;
      }
    }
  )

  // Get guild statistics
  .get(
    "/:guildId/statistics",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    requirePermission(PermissionFlags.ANALYTICS_VIEW),
    async (c) => {
      // Guild ID is extracted from params by context middleware
      const stats = await Guild.getStatistics();
      return c.json(stats);
    }
  );
