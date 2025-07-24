import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Redis } from "@ticketsbot/core";
import { Actor } from "@ticketsbot/core/context";
import { createRoute, ApiErrors, successResponse } from "../factory";
import { compositions } from "../middleware/factory-middleware";
import { PreferenceKeySchema } from "../utils/validation-schemas";

// Constants
const PREFERENCE_TTL = 60 * 60 * 24 * 30; // 30 days

// Request/Response schemas
const SetPreferenceSchema = z.object({
  key: PreferenceKeySchema,
  value: z.any(),
});

const _PreferenceResponse = z.object({
  value: z.any().nullable(),
});

// Helper to get Redis key for user preferences
const getPreferenceKey = (discordId: string, key: string) => `preferences:user:${discordId}:${key}`;

// Create user routes using method chaining
export const userRoutes = createRoute()
  // Get user preference by key
  .get("/preferences/:key", ...compositions.authenticated, async (c) => {
    const key = c.req.param("key");
    const actor = Actor.use();

    if (actor.type !== "web_user") {
      throw ApiErrors.badRequest("Invalid user context");
    }

    // If Discord is not connected, return null
    if (!actor.properties.discordId) {
      return c.json({ value: null } satisfies z.infer<typeof _PreferenceResponse>);
    }

    if (!Redis.isAvailable()) {
      // Redis unavailable, return null
      return c.json({ value: null } satisfies z.infer<typeof _PreferenceResponse>);
    }

    try {
      const value = await Redis.withRetry(async (client) => {
        const redisKey = getPreferenceKey(actor.properties.discordId!, key);
        const data = await client.get(redisKey);
        return data ? JSON.parse(data) : null;
      }, "get-preference");

      return c.json({ value } satisfies z.infer<typeof _PreferenceResponse>);
    } catch (error) {
      console.error("Failed to get preference:", error);
      // Return null on error rather than failing
      return c.json({ value: null } satisfies z.infer<typeof _PreferenceResponse>);
    }
  })

  // Set user preference
  .post(
    "/preferences",
    ...compositions.authenticated,
    zValidator("json", SetPreferenceSchema),
    async (c) => {
      const { key, value } = c.req.valid("json");
      const actor = Actor.use();

      if (actor.type !== "web_user") {
        throw ApiErrors.badRequest("Invalid user context");
      }

      // If Discord is not connected, return success but don't store
      if (!actor.properties.discordId) {
        return c.json(successResponse());
      }

      if (!Redis.isAvailable()) {
        // Redis unavailable, acknowledge but don't store
        return c.json(successResponse());
      }

      try {
        await Redis.withRetry(async (client) => {
          const redisKey = getPreferenceKey(actor.properties.discordId!, key);
          await client.setEx(redisKey, PREFERENCE_TTL, JSON.stringify(value));
        }, "set-preference");

        return c.json(successResponse());
      } catch (error) {
        console.error("Failed to set preference:", error);
        throw ApiErrors.internal("Failed to save preference");
      }
    }
  )

  // Delete user preference
  .delete("/preferences/:key", ...compositions.authenticated, async (c) => {
    const key = c.req.param("key");
    const actor = Actor.use();

    if (actor.type !== "web_user") {
      throw ApiErrors.badRequest("Invalid user context");
    }

    // If Discord is not connected, return success
    if (!actor.properties.discordId) {
      return c.json(successResponse());
    }

    if (!Redis.isAvailable()) {
      // Redis unavailable, return success
      return c.json(successResponse());
    }

    try {
      await Redis.withRetry(async (client) => {
        const redisKey = getPreferenceKey(actor.properties.discordId!, key);
        await client.del(redisKey);
      }, "delete-preference");

      return c.json(successResponse());
    } catch (error) {
      console.error("Failed to delete preference:", error);
      throw ApiErrors.internal("Failed to delete preference");
    }
  });
