import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { Guild } from "@ticketsbot/core/domains";
import { requireAuth, requirePermission } from "../middleware/context";
import { PermissionFlags } from "@ticketsbot/core";
import type { AuthSession } from "@ticketsbot/core/auth";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

export const guilds: Hono<{ Variables: Variables }> = new Hono<{ Variables: Variables }>();

// GET /guilds/:guildId/tickets/stats - Get ticket statistics for a guild (all timeframes)
guilds.get(
  "/:guildId/tickets/stats",
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

      // Get statistics from the Guild domain - now returns all timeframes
      const stats = await Guild.getStatistics();

      // The Guild.getStatistics now returns data for all timeframes
      return c.json(stats);
    } catch (error) {
      console.error("Error fetching ticket statistics:", error);
      return c.json({ error: "Failed to fetch statistics" }, 500);
    }
  }
);

// Note: /guilds/:guildId/tickets/active and /guilds/:guildId/tickets/closed endpoints
// have been removed in favor of using the main /tickets endpoint with optional status filter.
// This improves performance by allowing client-side filtering of a single query.
