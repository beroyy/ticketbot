export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  WEB_URL: process.env.WEB_URL || "http://localhost:3000",
  API_URL: process.env.API_URL || "http://localhost:3001",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  COOKIE_DOMAIN:
    process.env.NODE_ENV === "production"
      ? `.${process.env.WEB_URL?.split("://")[1]}`
      : "localhost",

  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",

  isDev: () => process.env.NODE_ENV === "development",
  isProd: () => process.env.NODE_ENV === "production",
};
