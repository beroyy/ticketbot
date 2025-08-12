import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "@ticketsbot/db";
import { createRoute } from "../../factory";
import { ApiErrors } from "../../utils/error-handler";
import { compositions } from "../../middleware/context";
import { requireRole } from "../../middleware/permissions";
import { defaultSettings, UpdateSettingsSchema } from "./schemas";

export const settingsRoutes = createRoute()
  .get(
    "/:guildId",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: z.string() })),
    requireRole(["owner", "admin", "support"]),

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
    zValidator("param", z.object({ guildId: z.string() })),
    zValidator("json", UpdateSettingsSchema),
    requireRole(["owner", "admin"]),
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
    zValidator("param", z.object({ guildId: z.string() })),
    async (c) => {
      const { guildId } = c.req.valid("param");
      const roles = await db.guild.getTeamRoles(guildId);
      return c.json(roles);
    }
  )

  .get(
    "/:guildId/permissions",
    ...compositions.authenticated,
    zValidator("param", z.object({ guildId: z.string() })),
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

      const roles = await db.role.getUserRoles(guildId, user.discordUserId);

      return c.json({
        roles: roles.map((role: any) => ({
          id: role.id,
          name: role.name,
          discordRoleId: role.discordRoleId,
        })),
      });
    }
  );
