import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema, PermissionFlags } from "@ticketsbot/core";
import { Guild } from "@ticketsbot/core/domains";
import { createRoute } from "../factory";
import { compositions, requirePermission } from "../middleware/factory-middleware";

// Create guild routes using method chaining
export const guildRoutes = createRoute()
  // Get ticket statistics for a guild (all timeframes)
  .get(
    "/:guildId/tickets/stats",
    ...compositions.authenticated,
    zValidator(
      "param",
      z.object({
        guildId: DiscordGuildIdSchema,
      })
    ),
    requirePermission(PermissionFlags.ANALYTICS_VIEW),
    async (c) => {
      const { guildId } = c.req.valid("param");

      // Set guild context
      c.set("guildId", guildId);

      // Get statistics from the Guild domain - returns all timeframes
      const stats = await Guild.getStatistics();

      return c.json(stats);
    }
  );

// Note: Other guild endpoints like active/closed tickets have been removed
// in favor of using the main /tickets endpoint with status filtering.
// This improves performance by allowing client-side filtering.
