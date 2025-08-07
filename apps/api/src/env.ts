export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
  NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
  NEXT_PUBLIC_DISCORD_CLIENT_SECRET: process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET || "",
  API_HOST: process.env.API_HOST || "0.0.0.0",
  API_SECRET: process.env.API_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  WEB_URL: process.env.WEB_URL || "http://localhost:3000",
  API_URL: process.env.API_URL || "http://localhost:3001",

  isDev: () => process.env.NODE_ENV === "development",
  isProd: () => process.env.NODE_ENV === "production",
};

export type ApiEnv = typeof env;
