import { env, isDocker } from "./env";
import { logger } from "./utils/logger";

if (isDocker()) {
  logger.debug("🐳 Running in Docker - using environment variables from container");
} else {
  logger.debug("✅ Environment variables loaded and validated");
}

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth } from "@ticketsbot/core/auth";
import { Redis } from "@ticketsbot/core";
import { tickets } from "./routes/tickets";
import { discord } from "./routes/discord";
import { panels } from "./routes/panels";
import { settings } from "./routes/settings";
import { forms } from "./routes/forms";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { guilds } from "./routes/guilds";
import { schemas } from "./routes/schemas";
import { user } from "./routes/user";
import { errorHandler } from "./utils/error-handler";

logger.debug("🔍 Validated Environment Variables:", {
  WEB_URL: env.WEB_URL,
  API_URL: env.API_URL,
  WEB_PORT: env.WEB_PORT ?? "not set",
  API_PORT: env.API_PORT,
  NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL ?? "not set",
});

const app = new Hono();

app.onError(errorHandler);

const webUrl = env.WEB_URL;

const additionalOrigins = env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()) || [];
const allowedOrigins = [webUrl, ...additionalOrigins].filter(Boolean);

logger.debug("🔒 CORS Configuration:", {
  allowedOrigins,
  credentials: true,
});

app.use("/*", async (c, next) => {
  const origin = c.req.header("origin");
  logger.request(c.req.method, c.req.path, origin);
  await next();
});

app.use(
  "/*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/api/auth", authRoutes);
app.route("/tickets", tickets);
app.route("/discord", discord);
app.route("/panels", panels);
app.route("/settings", settings);
app.route("/forms", forms);
app.route("/guilds", guilds);
app.route("/user", user);

app.route("/health", healthRoutes);
app.route("/schemas", schemas);

const port = process.env.PORT ? parseInt(process.env.PORT) : env.API_PORT;
const host = env.API_HOST;

// Initialize Redis
Redis.initialize()
  .then(() => {
    logger.info("✅ Redis initialized (if configured)");
  })
  .catch((error: unknown) => {
    logger.warn("⚠️ Redis initialization failed:", error);
  });

logger.info(`🚀 API server listening on ${host}:${port} (${env.NODE_ENV})`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

process.on("SIGINT", async () => {
  logger.info("Received SIGINT. Graceful shutdown...");
  await Redis.shutdown();
  // eslint-disable-next-line no-process-exit -- Graceful shutdown requires process.exit
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM. Graceful shutdown...");
  await Redis.shutdown();
  // eslint-disable-next-line no-process-exit -- Graceful shutdown requires process.exit
  process.exit(0);
});
