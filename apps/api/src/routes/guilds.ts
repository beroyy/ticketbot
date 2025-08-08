import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema, PermissionFlags } from "@ticketsbot/core";
import { Guild } from "@ticketsbot/core/domains/guild";
import { createRoute } from "../factory";
import { compositions, requirePermission } from "../middleware/context";

export const guildRoutes = createRoute().get(
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
    // Guild ID is extracted from params by context middleware
    // Get statistics from the Guild domain - returns all timeframes
    const stats = await Guild.getStatistics();

    return c.json(stats);
  }
);

// Note: Other guild endpoints like active/closed tickets have been removed
// in favor of using the main /tickets endpoint with status filtering.
// This improves performance by allowing client-side filtering.
