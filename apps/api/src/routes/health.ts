import { createRoute } from "../factory";
import { compositions } from "../middleware/context";

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
    };
    scheduledTasks?: {
      enabled: boolean;
      status: "healthy" | "unhealthy" | "not_configured";
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
        database: { status: "healthy" }, // TODO: Actually check database
        auth: { status: "healthy" },
      },
    };

    // Check if scheduled tasks (BullMQ) are available
    // We keep Redis for BullMQ only
    try {
      const { Redis } = await import("@ticketsbot/core");
      if (Redis.isAvailable()) {
        const redisHealth = await Redis.healthCheck();
        result.services.scheduledTasks = {
          enabled: true,
          status: redisHealth.connected ? "healthy" : "unhealthy",
        };
      } else {
        result.services.scheduledTasks = {
          enabled: false,
          status: "not_configured",
        };
      }
    } catch {
      result.services.scheduledTasks = {
        enabled: false,
        status: "not_configured",
      };
    }

    // Update overall status based on services
    if (result.services.database.status === "unhealthy") {
      result.status = "unhealthy";
    } else if (
      result.services.scheduledTasks?.status === "unhealthy" &&
      result.services.scheduledTasks.enabled
    ) {
      result.status = "degraded";
    }

    return c.json(result);
  });
