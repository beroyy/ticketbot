import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema, createLogger } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";
import { createRoute } from "../factory";
import { compositions } from "../middleware/context";

const logger = createLogger("api:permissions");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PermissionsResponseSchema = z.object({
  permissions: z.string(),
  guildId: z.string(),
  userId: z.string().nullable(),
});

type PermissionsResponse = z.infer<typeof PermissionsResponseSchema>;

export const permissionRoutes = createRoute().get(
  "/:guildId",
  ...compositions.authenticated,
  zValidator("param", z.object({ guildId: DiscordGuildIdSchema })),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const user = c.get("user");

    logger.debug("Fetching permissions", {
      guildId,
      userId: user.id,
      discordUserId: user.discordUserId,
    });

    const discordUserId = user.discordUserId;
    if (!discordUserId) {
      return c.json({
        permissions: "0",
        guildId,
        userId: null,
      } satisfies PermissionsResponse);
    }

    const permissions = await db.role.getUserPermissions(guildId, discordUserId);

    logger.debug("Calculated permissions", {
      guildId,
      discordUserId,
      permissions: permissions.toString(),
    });

    return c.json({
      permissions: permissions.toString(),
      guildId,
      userId: discordUserId,
    } satisfies PermissionsResponse);
  }
);
