import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getRedisService } from "@ticketsbot/core/auth";
import { requireAuth } from "../../middleware/context";
import { Actor } from "@ticketsbot/core/context";
import { PreferenceKeySchema, PreferenceParamSchema } from "../../utils/validation-schemas";
import type { AuthSession } from "@ticketsbot/core/auth";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

export const preferences = new Hono<{ Variables: Variables }>();

// Schema for preferences
const setPreferenceSchema = z.object({
  key: PreferenceKeySchema,
  value: z.any(),
});

const PREFERENCE_TTL = 60 * 60 * 24 * 30; // 30 days

// Get user preference
preferences.get(
  "/:key",
  requireAuth,
  zValidator("param", PreferenceParamSchema),
  async (c) => {
    const { key } = c.req.valid("param");
    const actor = Actor.use();

  if (actor.type !== "web_user") {
    return c.json({ error: "Invalid user context" }, 400);
  }

  // If Discord is not connected, return null for preference
  if (!actor.properties.discordId) {
    return c.json({ value: null });
  }

  const redisService = getRedisService();
  if (!redisService) {
    // Fallback: return null if Redis is not available
    return c.json({ value: null });
  }

  try {
    const value = await redisService.withRetry(async (client) => {
      const redisKey = `preferences:user:${actor.properties.discordId}:${key}`;
      const data = await client.get(redisKey);
      return data ? JSON.parse(data) : null;
    }, "get-preference");

    return c.json({ value });
  } catch (error) {
    console.error("Failed to get preference:", error);
    return c.json({ value: null });
  }
});

// Set user preference
preferences.post(
  "/",
  requireAuth,
  zValidator("json", setPreferenceSchema),
  async (c) => {
    const validated = c.req.valid("json");
    const actor = Actor.use();

  if (actor.type !== "web_user") {
    return c.json({ error: "Invalid user context" }, 400);
  }

  // If Discord is not connected, return success but don't store
  if (!actor.properties.discordId) {
    return c.json({ success: true });
  }

  const redisService = getRedisService();
  if (!redisService) {
    // Fallback: acknowledge but don't store if Redis is not available
    return c.json({ success: true });
  }

  try {
    await redisService.withRetry(async (client) => {
      const redisKey = `preferences:user:${actor.properties.discordId}:${validated.key}`;
      await client.setEx(redisKey, PREFERENCE_TTL, JSON.stringify(validated.value));
    }, "set-preference");

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to set preference:", error);
    return c.json({ error: "Failed to save preference" }, 500);
  }
});

// Delete user preference
preferences.delete(
  "/:key",
  requireAuth,
  zValidator("param", PreferenceParamSchema),
  async (c) => {
    const { key } = c.req.valid("param");
    const actor = Actor.use();

  if (actor.type !== "web_user") {
    return c.json({ error: "Invalid user context" }, 400);
  }

  // If Discord is not connected, return success but don't delete
  if (!actor.properties.discordId) {
    return c.json({ success: true });
  }

  const redisService = getRedisService();
  if (!redisService) {
    return c.json({ success: true });
  }

  try {
    await redisService.withRetry(async (client) => {
      const redisKey = `preferences:user:${actor.properties.discordId}:${key}`;
      await client.del(redisKey);
    }, "delete-preference");

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete preference:", error);
    return c.json({ error: "Failed to delete preference" }, 500);
  }
});

export default preferences;
