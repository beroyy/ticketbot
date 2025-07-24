import { z } from "zod";

// Custom stringbool type for parsing "true"/"false" strings to boolean
const stringbool = () => z.string().transform((val) => val === "true");

// Bot environment schema using Zod v4 features
const envSchema = z.object({
  // Core configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),

  // Discord configuration
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().regex(/^\d+$/), // Discord IDs are numeric strings
  DISCORD_CLIENT_SECRET: z.string().min(1),

  // Service URLs (required)
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),

  // Bot specific configuration
  BOT_PORT: z.coerce.number().int().positive().default(3002),
  DISCORD_BOT_PREFIX: z.string().max(5).default("!").optional(),
  DISCORD_BOT_STATUS: z.string().max(128).optional(),

  // Optional services
  REDIS_URL: z.string().url().optional(),

  // Logging configuration
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  LOG_REQUESTS: stringbool().optional(),

  // Development helpers
  DEV_PERMISSIONS_HEX: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/)
    .optional(),
  DEV_GUILD_ID: z.string().regex(/^\d+$/).optional(),
  DEV_DB_AUTO_SEED: stringbool().optional(),

  // Skip database initialization flag
  SKIP_DB_INIT: stringbool().optional(),
});

// Parse and validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);

  // Derive additional values
  const isDev = env.NODE_ENV === "development";

  // Add derived values and smart defaults
  const completeEnv = {
    ...env,
    // Smart defaults based on environment
    LOG_LEVEL: env.LOG_LEVEL || (isDev ? "debug" : "warn"),
    LOG_REQUESTS: env.LOG_REQUESTS ?? isDev,
    // Derived values
    DISCORD_REDIRECT_URI: `${env.API_URL}/auth/callback/discord`,
  };

  env = completeEnv as typeof env;

  console.log("✅ [Bot] Environment variables loaded and validated");

  if (isDev) {
    console.log({
      environment: env.NODE_ENV,
      port: env.BOT_PORT,
      clientId: env.DISCORD_CLIENT_ID,
      redis: env.REDIS_URL ? "configured" : "not configured",
      status: env.DISCORD_BOT_STATUS || "default",
    });
  }
} catch (error) {
  console.error("\n❌ Bot Environment Validation Failed!\n");

  if (error instanceof z.ZodError) {
    console.error("Validation errors:");
    error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
  }

  console.error("\n📋 Required environment variables for Bot:");
  console.error("  NODE_ENV:", process.env.NODE_ENV || "❌ Missing");
  console.error("  DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "❌ Missing");
  console.error("  BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "✓ Set" : "❌ Missing");
  console.error("  DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✓ Set" : "❌ Missing");
  console.error("  DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "✓ Set" : "❌ Missing");
  console.error(
    "  DISCORD_CLIENT_SECRET:",
    process.env.DISCORD_CLIENT_SECRET ? "✓ Set" : "❌ Missing"
  );
  console.error("  WEB_URL:", process.env.WEB_URL || "❌ Missing");
  console.error("  API_URL:", process.env.API_URL || "❌ Missing");

  console.error("\n💡 Tips:");
  console.error("  - Check that .env file exists in the monorepo root");
  console.error("  - Run 'pnpm env:validate --example' to see example .env");

  throw new Error("Environment validation failed");
}

// Export the validated environment
export { env };

// Export bot configuration
export const botConfig = {
  discordToken: env.DISCORD_TOKEN,
  clientId: env.DISCORD_CLIENT_ID,
  databaseUrl: env.DATABASE_URL,
  environment: env.NODE_ENV,
  prefix: env.DISCORD_BOT_PREFIX || "!",
  status: env.DISCORD_BOT_STATUS,
};

// Helper functions
export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
