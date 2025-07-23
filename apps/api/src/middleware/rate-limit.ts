import type { Context as _Context, Next as _Next, MiddlewareHandler } from "hono";
import { getRedisService } from "@ticketsbot/core/auth";
import { env, isProduction } from "../env";

interface RateLimitConfig {
  window: number;
  max: number;
  keyPrefix?: string;
}

export function createRateLimit(config: RateLimitConfig): MiddlewareHandler {
  const { window, max, keyPrefix = "api" } = config;

  return async (c, next) => {
    if (!isProduction() && !env.RATE_LIMIT_ENABLED) {
      return next();
    }

    const redisService = getRedisService();
    if (!redisService) {
      console.warn("Rate limiting disabled - Redis not available");
      return next();
    }

    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const path = c.req.path;
    const key = `ratelimit:${keyPrefix}:${ip}:${path}`;

    try {
      const result = await redisService.withRetry(async (client) => {
        const current = await client.get(key);
        const count = current ? parseInt(current) : 0;

        if (count >= max) {
          const ttl = await client.ttl(key);
          return { allowed: false, retryAfter: ttl > 0 ? ttl : window };
        }

        const multi = client.multi();
        multi.incr(key);
        if (count === 0) {
          multi.expire(key, window);
        }
        await multi.exec();

        return { allowed: true, remaining: max - count - 1, retryAfter: 0 };
      }, "rateLimit");

      if (!result.allowed) {
        const retryAfter = result.retryAfter || window;
        c.header("X-RateLimit-Limit", max.toString());
        c.header("X-RateLimit-Remaining", "0");
        c.header("X-RateLimit-Reset", (Date.now() + retryAfter * 1000).toString());
        c.header("Retry-After", retryAfter.toString());

        return c.json(
          {
            error: "Too many requests",
            message: `Rate limit exceeded. Please retry after ${retryAfter.toString()} seconds.`,
          },
          429
        );
      }

      c.header("X-RateLimit-Limit", max.toString());
      c.header("X-RateLimit-Remaining", (result.remaining || 0).toString());
      c.header("X-RateLimit-Reset", (Date.now() + window * 1000).toString());

      await next();
    } catch (error) {
      console.error("Rate limit check failed:", error);
      return next();
    }
  };
}

export const rateLimits = {
  strict: createRateLimit({ window: 300, max: 5 }),
  moderate: createRateLimit({ window: 60, max: 30 }),
  lenient: createRateLimit({ window: 60, max: 60 }),
  deployment: createRateLimit({ window: 300, max: 3, keyPrefix: "deploy" }),
  settings: createRateLimit({ window: 60, max: 20, keyPrefix: "settings" }),
};
