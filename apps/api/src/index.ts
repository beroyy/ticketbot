import { env } from "./env";
import { logger } from "./utils/logger";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth } from "@ticketsbot/core/auth";
import type { AppEnv } from "./factory";
import { errorHandler } from "./utils/error-handler";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { schemaRoutes } from "./routes/schemas";
import { userRoutes } from "./routes/user";
import { discordRoutes } from "./routes/discord";
import { panelRoutes } from "./routes/panels";
import { settingsRoutes } from "./routes/settings";
import { formRoutes } from "./routes/forms";
import { guildRoutes } from "./routes/guilds";
import { ticketRoutes } from "./routes/tickets";
import { Redis } from "@ticketsbot/core";

logger.debug("🔍 Validated Environment Variables:", {
  WEB_URL: env.WEB_URL,
  API_URL: env.API_URL,
  WEB_PORT: env.WEB_PORT ?? "not set",
  API_PORT: env.API_PORT,
  NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL ?? "not set",
});

const app = new Hono<AppEnv>().onError(errorHandler);

// Parse allowed origins from env
const webUrl = env.WEB_URL;
const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [webUrl];

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

const _routes = app
  .route("/auth", authRoutes)
  .route("/health", healthRoutes)
  .route("/schemas", schemaRoutes)
  .route("/user", userRoutes)
  .route("/discord", discordRoutes)
  .route("/panels", panelRoutes)
  .route("/settings", settingsRoutes)
  .route("/forms", formRoutes)
  .route("/guilds", guildRoutes)
  .route("/tickets", ticketRoutes);

export type AppType = typeof _routes;

const port = process.env.PORT ? parseInt(process.env.PORT) : env.API_PORT;
const host = env.API_HOST;

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
