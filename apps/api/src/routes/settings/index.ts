import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema, PermissionFlags } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";
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
        const settings = await db.guild.getGuildSettings(guildId);
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
      const { guildId } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        const updatedSettings = await db.guild.updateGuildSettings(guildId, input);
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
      const { guildId } = c.req.valid("param");
      const roles = await db.guild.getTeamRoles(guildId);
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
        db.role.getUserPermissions(guildId, user.discordUserId),
        db.role.getUserRoles(guildId, user.discordUserId),
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
  );
