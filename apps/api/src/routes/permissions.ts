import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { Role } from "@ticketsbot/core/domains";
import { createRoute } from "../factory";
import { compositions } from "../middleware/context";
import { logger } from "../utils/logger";

// Response schemas
const PermissionsResponse = z.object({
  permissions: z.string(), // BigInt as string
  guildId: z.string(),
  userId: z.string().nullable(),
});

export const permissionRoutes = createRoute()
  // Get user permissions for a guild
  .get(
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

      // Get Discord user ID
      const discordUserId = user.discordUserId;
      if (!discordUserId) {
        return c.json({
          permissions: "0",
          guildId,
          userId: null,
        } satisfies z.infer<typeof PermissionsResponse>);
      }

      // Calculate permissions fresh (no caching)
      const permissions = await Role.getUserPermissions(guildId, discordUserId);
      
      logger.debug("Calculated permissions", {
        guildId,
        discordUserId,
        permissions: permissions.toString(),
      });

      return c.json({
        permissions: permissions.toString(),
        guildId,
        userId: discordUserId,
      } satisfies z.infer<typeof PermissionsResponse>);
    }
  );