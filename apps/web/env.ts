export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  WEB_URL: process.env.WEB_URL || "http://localhost:3000",
  API_URL: process.env.API_URL || "http://localhost:3001",

  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",

  NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",

  isDev: () => (process.env.NODE_ENV || "development") === "development",
  isProd: () => process.env.NODE_ENV === "production",
  isTest: () => process.env.NODE_ENV === "test",
};

export type WebEnv = typeof env;
