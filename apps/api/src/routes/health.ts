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

    // Scheduled tasks now use pg_cron instead of Redis/BullMQ
    result.services.scheduledTasks = {
      enabled: true,
      status: "healthy", // pg_cron runs in the database
    };

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
