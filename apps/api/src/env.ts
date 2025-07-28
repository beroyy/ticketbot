import { z } from "zod";

// Custom stringbool type for parsing "true"/"false" strings to boolean
const stringbool = () => z.string().transform((val) => val === "true");

// API environment schema using Zod v4 features
const envSchema = z.object({
  // Core configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),

  // Discord configuration
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().regex(/^\d+$/), // Discord IDs are numeric strings
  DISCORD_CLIENT_SECRET: z.string().min(1),

  // Service URLs (required)
  WEB_URL: z.url(),
  API_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url().optional(), // For CORS validation

  // API specific configuration
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_SECRET: z.string().min(32).optional(),

  // Optional services
  REDIS_URL: z.url().optional(),

  // Logging configuration
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  LOG_REQUESTS: stringbool().optional(),

  // Rate limiting
  RATE_LIMIT_ENABLED: stringbool().optional(),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),

  // CORS configuration
  ALLOWED_ORIGINS: z.string().optional(), // Comma-separated list
  COOKIE_DOMAIN: z.string().optional(),

  // Development helpers
  DEV_PERMISSIONS_HEX: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/)
    .optional(),
  DEV_GUILD_ID: z.string().regex(/^\d+$/).optional(),
  DEV_DB_AUTO_SEED: stringbool().optional(),
});

// Parse and validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);

  // Derive additional values
  const isDev = env.NODE_ENV === "development";

  // Add derived values
  const completeEnv = {
    ...env,
    // Smart defaults based on environment
    LOG_LEVEL: env.LOG_LEVEL || (isDev ? "debug" : "warn"),
    LOG_REQUESTS: env.LOG_REQUESTS ?? isDev,
    RATE_LIMIT_ENABLED: env.RATE_LIMIT_ENABLED ?? !isDev,
    // Derived values
    DISCORD_REDIRECT_URI: `${env.API_URL}/auth/callback/discord`,
  };

  env = completeEnv as typeof env;

  // Log configuration in development
  if (isDev) {
    console.log("🔧 API Environment:", {
      environment: env.NODE_ENV,
      apiUrl: env.API_URL,
      webUrl: env.WEB_URL,
      port: env.API_PORT,
      host: env.API_HOST,
      redis: env.REDIS_URL ? "configured" : "not configured",
      logLevel: env.LOG_LEVEL,
    });
  }
} catch (error) {
  console.error("\n❌ API Environment Validation Failed!\n");

  if (error instanceof z.ZodError) {
    console.error("Validation errors:");
    error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
  }

  console.error("\n📋 Required environment variables for API:");
  console.error("  NODE_ENV:", process.env.NODE_ENV || "❌ Missing");
  console.error("  DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "❌ Missing");
  console.error("  BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "✓ Set" : "❌ Missing");
  console.error("  DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "✓ Set" : "❌ Missing");
  console.error(
    "  DISCORD_CLIENT_SECRET:",
    process.env.DISCORD_CLIENT_SECRET ? "✓ Set" : "❌ Missing"
  );
  console.error("  DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✓ Set" : "❌ Missing");
  console.error("  WEB_URL:", process.env.WEB_URL || "❌ Missing");
  console.error("  API_URL:", process.env.API_URL || "❌ Missing");

  console.error("\n💡 Tips:");
  console.error("  - Check that .env file exists in the monorepo root");
  console.error("  - Run 'pnpm env:validate --example' to see example .env");

  throw new Error("Environment validation failed");
}

// Export the validated and complete environment
export { env };

// Type export
export type ApiEnv = typeof env;

// Helper functions
export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
