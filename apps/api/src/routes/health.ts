import { Redis } from "@ticketsbot/core";
import { prisma } from "@ticketsbot/core/prisma";
import { createRoute } from "../factory";
import { compositions } from "../middleware/context";
import { env } from "../env";

type HealthStatus = "healthy" | "unhealthy" | "degraded";

type ServiceStatus = {
  status: "healthy" | "unhealthy";
  latency?: number;
  error?: string;
};

type HealthCheckResult = {
  status: HealthStatus;
  timestamp: string;
  services: {
    database: ServiceStatus;
    auth: {
      status: "healthy" | "unhealthy";
      redisEnabled: boolean;
    };
    redis?: ServiceStatus;
    rateLimit?: {
      enabled: boolean;
      storage: "redis" | "memory";
    };
  };
};

export const healthRoutes = createRoute()
  .get("/", ...compositions.public, async (c) => {
    return c.json({
      status: "ok" as const,
      timestamp: new Date().toISOString(),
    });
  })

  .get("/detailed", ...compositions.public, async (c) => {
    const result: HealthCheckResult = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: "unhealthy" },
        auth: { status: "healthy", redisEnabled: false },
      },
    };

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
        result.status = result.status === "unhealthy" ? "unhealthy" : "degraded";
      }
    }

    const rateLimitEnabled = env.isProd();
    result.services.rateLimit = {
      enabled: rateLimitEnabled,
      storage:
        Redis.isAvailable() && result.services.redis?.status === "healthy" ? "redis" : "memory",
    };

    if (result.services.database.status === "unhealthy") {
      result.status = "unhealthy";
    } else if (result.services.redis && result.services.redis.status === "unhealthy") {
      result.status = "degraded";
    }

    return c.json(result);
  })

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
    });
  });
