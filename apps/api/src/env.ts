import { loadEnv, createAppEnvLoader, z } from "@ticketsbot/core/env";

// API-specific environment overrides (all optional)
const ApiSpecificSchema = z.object({
  // API-specific configurations
  API_HOST: z.string().default("0.0.0.0"),
  API_SECRET: z.string().min(32).optional(),
  
  // Runtime flags
  RUNNING_IN_DOCKER: z.stringbool().default(false).optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW: z.coerce.number().positive().optional(),
  RATE_LIMIT_MAX: z.coerce.number().positive().optional(),
});

// Create API environment loader
const loadApiEnv = createAppEnvLoader(ApiSpecificSchema);

let env: ReturnType<typeof loadApiEnv>;

try {
  env = loadApiEnv();
  
  // Log derived values in development
  if (env.NODE_ENV === "development") {
    console.log("🔧 API Environment loaded:");
    console.log(`   API URL: ${env.API_URL} (port ${env.API_PORT})`);
    console.log(`   Web URL: ${env.WEB_URL}`);
    console.log(`   Redis: ${env.REDIS_URL ? "Connected" : "Not configured"}`);
    console.log(`   Rate limiting: ${env.RATE_LIMIT_ENABLED ? "Enabled" : "Disabled"}`);
  }
} catch (error) {
  console.error("\n❌ API Environment Validation Failed!\n");

  if (error instanceof Error) {
    console.error(error.message);
    console.error("\n📋 Required environment variables:");
    console.error("  NODE_ENV:", process.env.NODE_ENV || "❌ Missing");
    console.error("  DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "❌ Missing");
    console.error("  BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "✓ Set" : "❌ Missing");
    console.error("  DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "✓ Set" : "❌ Missing");
    console.error("  DISCORD_CLIENT_SECRET:", process.env.DISCORD_CLIENT_SECRET ? "✓ Set" : "❌ Missing");
    console.error("  DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✓ Set" : "❌ Missing");

    console.error("\n💡 Tips:");
    console.error("  - Only essential environment variables are required");
    console.error("  - Most values (URLs, ports) are derived automatically");
    console.error("  - Check that .env file exists in the monorepo root");
    console.error("  - Run 'pnpm env:setup dev' from the root to generate .env");
    console.error("  - Run 'pnpm env:validate --example' to see example .env");
  }

  throw new Error("Environment validation failed");
}

export { env };

export type ApiEnv = typeof env;

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
export const isDocker = () => env.RUNNING_IN_DOCKER;
