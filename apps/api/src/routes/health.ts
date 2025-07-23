import { Hono } from "hono";
import { getRedisService } from "@ticketsbot/core/auth";
import { prisma } from "@ticketsbot/core/prisma";
import { rateLimits } from "../middleware/rate-limit";
import { env, isProduction } from "../env";

export const healthRoutes: Hono = new Hono();

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: {
      status: "healthy" | "unhealthy";
      latency?: number;
      error?: string;
    };
    redis?: {
      status: "healthy" | "unhealthy";
      latency?: number;
      error?: string;
    };
    auth: {
      status: "healthy" | "unhealthy";
      redisEnabled: boolean;
    };
    rateLimit?: {
      enabled: boolean;
      storage: "redis" | "memory";
    };
  };
}

/**
 * Basic health check endpoint
 */
healthRoutes.get("/", rateLimits.lenient, (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed health check endpoint
 * Checks all critical services
 */
healthRoutes.get("/detailed", rateLimits.strict, async (c) => {
  const result: HealthCheckResult = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "unhealthy" },
      auth: { status: "healthy", redisEnabled: false },
    },
  };

  // Check database
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

  // Check Redis if configured
  const redisService = getRedisService();
  if (redisService) {
    const redisHealth = await redisService.healthCheck();

    if (redisHealth.connected) {
      result.services.redis = {
        status: "healthy" as const,
        ...(redisHealth.latency !== undefined && { latency: redisHealth.latency }),
      };
      result.services.auth.redisEnabled = true;
    } else {
      result.services.redis = {
        status: "unhealthy" as const,
        ...(redisHealth.error !== undefined && { error: redisHealth.error }),
      };
      result.status = result.status === "unhealthy" ? "unhealthy" : "degraded";
    }
  }

  // Add rate limit status
  const rateLimitEnabled = isProduction() || env.RATE_LIMIT_ENABLED === true;
  result.services.rateLimit = {
    enabled: rateLimitEnabled,
    storage: redisService && result.services.redis?.status === "healthy" ? "redis" : "memory",
  };

  // Overall status determination
  if (result.services.database.status === "unhealthy") {
    result.status = "unhealthy";
  } else if (result.services.redis && result.services.redis.status === "unhealthy") {
    result.status = "degraded"; // App can work without Redis
  }

  return c.json(result);
});

/**
 * Redis-specific health check
 */
healthRoutes.get("/redis", async (c) => {
  const redisService = getRedisService();

  if (!redisService) {
    return c.json(
      {
        status: "not_configured",
        message: "Redis is not configured",
      },
      404
    );
  }

  const health = await redisService.healthCheck();

  return c.json({
    connected: health.connected,
    latency: health.latency,
    error: health.error,
    purpose: "permission_caching",
  });
});
