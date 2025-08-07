import { z } from "zod";
import { Redis } from "@ticketsbot/core";
import { prisma } from "@ticketsbot/core/prisma";
import { createRoute } from "../factory";
import { compositions } from "../middleware/context";
import { env } from "../env";

// Response schemas for type safety and documentation
const _BasicHealthResponse = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});

const ServiceStatus = z.enum(["healthy", "unhealthy", "degraded"]);

const _DetailedHealthResponse = z.object({
  status: ServiceStatus,
  timestamp: z.string(),
  services: z.object({
    database: z.object({
      status: z.enum(["healthy", "unhealthy"]),
      latency: z.number().optional(),
      error: z.string().optional(),
    }),
    redis: z
      .object({
        status: z.enum(["healthy", "unhealthy"]),
        latency: z.number().optional(),
        error: z.string().optional(),
      })
      .optional(),
    auth: z.object({
      status: z.enum(["healthy", "unhealthy"]),
      redisEnabled: z.boolean(),
    }),
    rateLimit: z
      .object({
        enabled: z.boolean(),
        storage: z.enum(["redis", "memory"]),
      })
      .optional(),
  }),
});

const _RedisHealthResponse = z.object({
  connected: z.boolean(),
  latency: z.number().optional(),
  error: z.string().optional(),
  purpose: z.literal("permission_caching"),
});

// Create the health routes using method chaining for RPC type inference
export const healthRoutes = createRoute()
  // Basic health check - public endpoint with lenient rate limiting
  .get("/", ...compositions.public, async (c) => {
    return c.json({
      status: "ok" as const,
      timestamp: new Date().toISOString(),
    } satisfies z.infer<typeof _BasicHealthResponse>);
  })

  // Detailed health check - checks all services
  .get("/detailed", ...compositions.public, async (c) => {
    const result: z.infer<typeof _DetailedHealthResponse> = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: "unhealthy" },
        auth: { status: "healthy", redisEnabled: false },
      },
    };

    // Check database health
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      result.services.database = {
        status: "healthy",
        latency: Date.now() - start,
      };
    } catch (error) {
      result.services.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      result.status = "unhealthy";
    }

    // Check Redis health
    if (Redis.isAvailable()) {
      const redisHealth = await Redis.healthCheck();

      if (redisHealth.connected) {
        result.services.redis = {
          status: "healthy",
          ...(redisHealth.latency !== undefined && { latency: redisHealth.latency }),
        };
        result.services.auth.redisEnabled = true;
      } else {
        result.services.redis = {
          status: "unhealthy",
          ...(redisHealth.error !== undefined && { error: redisHealth.error }),
        };
        // Degraded because app can work without Redis
        result.status = result.status === "unhealthy" ? "unhealthy" : "degraded";
      }
    }

    // Add rate limit status
    const rateLimitEnabled = env.isProd();
    result.services.rateLimit = {
      enabled: rateLimitEnabled,
      storage:
        Redis.isAvailable() && result.services.redis?.status === "healthy" ? "redis" : "memory",
    };

    // Overall status determination
    if (result.services.database.status === "unhealthy") {
      result.status = "unhealthy";
    } else if (result.services.redis && result.services.redis.status === "unhealthy") {
      result.status = "degraded";
    }

    return c.json(result);
  })

  // Redis-specific health check
  .get("/redis", ...compositions.public, async (c) => {
    if (!Redis.isAvailable()) {
      return c.json(
        {
          status: "not_configured",
          message: "Redis is not configured",
        },
        404
      );
    }

    const health = await Redis.healthCheck();

    return c.json({
      connected: health.connected,
      latency: health.latency,
      error: health.error,
      purpose: "permission_caching" as const,
    } satisfies z.infer<typeof _RedisHealthResponse>);
  });
