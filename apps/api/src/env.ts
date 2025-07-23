import { loadAndValidateEnv, z } from "@ticketsbot/core/env";

const ApiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RUNNING_IN_DOCKER: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true"),

  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.string().optional().default("3001").transform(Number).pipe(z.number().positive()),

  WEB_URL: z.string().url(),
  API_URL: z.string().url(),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_REDIRECT_URI: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),

  RATE_LIMIT_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  DEV_PERMISSIONS_HEX: z.string().optional(),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  LOG_REQUESTS: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true"),

  WEB_PORT: z.string().transform(Number).optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

let env: z.infer<typeof ApiEnvSchema>;

try {
  env = loadAndValidateEnv(ApiEnvSchema);
} catch (error) {
  console.error("\n❌ API Environment Validation Failed!\n");

  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
    console.error("\n📋 Current environment variables:");
    console.error("  NODE_ENV:", process.env.NODE_ENV);
    console.error("  API_PORT:", process.env.API_PORT);
    console.error("  API_HOST:", process.env.API_HOST);
    console.error("  WEB_URL:", process.env.WEB_URL);
    console.error("  API_URL:", process.env.API_URL);
    console.error("  DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "✗ Missing");
    console.error("  BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "✓ Set" : "✗ Missing");
    console.error("  DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "✓ Set" : "✗ Missing");
    console.error(
      "  DISCORD_CLIENT_SECRET:",
      process.env.DISCORD_CLIENT_SECRET ? "✓ Set" : "✗ Missing"
    );
    console.error("  DISCORD_REDIRECT_URI:", process.env.DISCORD_REDIRECT_URI);

    console.error("\n💡 Tips:");
    console.error("  - Check that .env file exists in the monorepo root");
    console.error("  - Run 'pnpm env:setup dev' from the root to generate .env");
    console.error("  - Ensure all required variables are set");
    console.error("  - URLs must include protocol (http:// or https://)");
  }

  throw new Error("Environment validation failed");
}

export { env };

export type ApiEnv = typeof env;

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
export const isDocker = () => env.RUNNING_IN_DOCKER;
