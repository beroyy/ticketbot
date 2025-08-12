import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema, PermissionFlags } from "@ticketsbot/core";
import { Guild } from "@ticketsbot/core/domains/guild";
import { Role } from "@ticketsbot/core/domains/role";
import { createRoute } from "../../factory";
import { ApiErrors } from "../../utils/error-handler";
import { compositions, requirePermission } from "../../middleware/context";
import { defaultSettings, UpdateSettingsSchema } from "./schemas";

export const settingsRoutes = createRoute()
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
          return c.json(defaultSettings(guildId));
        }
        throw error;
      }
    }
  )

  .put(
    "/:guildId",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    zValidator("json", UpdateSettingsSchema),
    requirePermission(PermissionFlags.GUILD_SETTINGS_EDIT),
    async (c) => {
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

  .get(
    "/:guildId/team-roles",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    async (c) => {
      const roles = await Guild.getTeamRoles();
      return c.json(roles);
    }
  )

  .get(
    "/:guildId/permissions",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    async (c) => {
      const { guildId } = c.req.valid("param");
      const user = c.get("user");

      if (!user.discordUserId) {
        return c.json(
          {
            error: "Discord account not linked",
            permissions: "0",
            roles: [],
          },
          200
        );
      }

      const [permissions, roles] = await Promise.all([
        Role.getUserPermissions(guildId, user.discordUserId),
        Role.getUserRoles(guildId, user.discordUserId),
      ]);

      return c.json({
        permissions: permissions.toString(),
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          permissions: role.permissions.toString(),
          discordRoleId: role.discordRoleId,
        })),
      });
    }
  )

  .get(
    "/:guildId/blacklist",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    requirePermission(PermissionFlags.MEMBER_BLACKLIST),
    async (c) => {
      const blacklist = await Guild.getBlacklist();
      return c.json(blacklist);
    }
  )

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

  .get(
    "/:guildId/statistics",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
    requirePermission(PermissionFlags.ANALYTICS_VIEW),
    async (c) => {
      const stats = await Guild.getStatistics();
      return c.json(stats);
    }
  );
