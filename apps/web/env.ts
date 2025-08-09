export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  WEB_URL: process.env.WEB_URL || "http://localhost:3000",
  API_URL: process.env.API_URL || "http://localhost:3001",

  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",

  NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",

  authCallbackUrl: typeof window !== "undefined" ? window.location.origin : undefined,
  discordInviteUrl: `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}`,

  // Use absolute URL with proxy path in development for client-side requests
  baseUrl: process.env.NODE_ENV === "development" 
    ? "http://localhost:3000/api/v1" 
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"),
  hmacSecret: process.env.API_SECRET,

  isDev: () => process.env.NODE_ENV === "development",
  isProd: () => process.env.NODE_ENV === "production",
  isTest: () => process.env.NODE_ENV === "test",
};

export type WebEnv = typeof env;
