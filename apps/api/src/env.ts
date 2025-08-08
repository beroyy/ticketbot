export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
  NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
  NEXT_PUBLIC_DISCORD_CLIENT_SECRET: process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  WEB_URL: process.env.WEB_URL || "http://localhost:3000",
  API_URL: process.env.API_URL || "http://localhost:3001",

  apiSecret: process.env.API_SECRET || "development-secret",

  isDev: () => process.env.NODE_ENV === "development",
  isProd: () => process.env.NODE_ENV === "production",
};

export type ApiEnv = typeof env;
