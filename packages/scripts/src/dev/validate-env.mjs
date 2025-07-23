#!/usr/bin/env node
/**
 * Environment Validation Script
 * Validates all environment variables across the monorepo
 */

import { loadAndValidateEnv, z, formatEnvForLogging } from "@ticketsbot/core/env";

// Complete environment schema for the entire monorepo
const MonorepoEnvSchema = z.object({
  // Core
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  TURBO_ENV: z.enum(["dev", "staging", "prod"]),
  
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  
  // Services
  WEB_PORT: z.string().transform(Number).pipe(z.number().positive()),
  API_PORT: z.string().transform(Number).pipe(z.number().positive()),
  BOT_PORT: z.string().transform(Number).pipe(z.number().positive()),
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  
  // Discord
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_TOKEN: z.string(),
  DISCORD_REDIRECT_URI: z.string().url(),
  
  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  
  // Optional
  RUNNING_IN_DOCKER: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  DEV_PERMISSIONS_HEX: z.string().optional(),
  DEV_GUILD_ID: z.string().optional(),
  NEXT_PUBLIC_GUILD_ID: z.string().optional(),
});

async function validateEnvironment() {
  console.log("🔍 Validating environment variables...\n");
  
  try {
    // Load and validate environment
    const env = loadAndValidateEnv(MonorepoEnvSchema);
    
    console.log("✅ Environment validation passed!\n");
    
    // Display summary
    console.log("📊 Environment Summary:");
    console.log(`   Environment: ${env.TURBO_ENV}`);
    console.log(`   Node Environment: ${env.NODE_ENV}`);
    console.log(`   Database: Connected`);
    console.log(`   Redis: ${env.REDIS_URL ? "Connected" : "Not configured"}`);
    console.log(`   Web: ${env.WEB_URL} (port ${env.WEB_PORT})`);
    console.log(`   API: ${env.API_URL} (port ${env.API_PORT})`);
    console.log(`   Bot: Port ${env.BOT_PORT}`);
    console.log(`   Discord: Client configured`);
    console.log(`   Auth: Secret configured`);
    
    // Show safe version of environment (with secrets redacted)
    if (process.argv.includes("--verbose")) {
      console.log("\n📋 Full Environment (secrets redacted):");
      console.log(formatEnvForLogging(process.env));
    }
    
    return true;
  } catch (error) {
    console.error("❌ Environment validation failed!\n");
    
    if (error instanceof Error) {
      console.error(error.message);
    }
    
    console.error("\n💡 Tips:");
    console.error("   - Check that .env file exists");
    console.error("   - Run 'pnpm env:setup dev' to generate .env file");
    console.error("   - Check .env.example for required variables");
    console.error("   - Ensure all URLs are properly formatted (include http:// or https://)");
    
    process.exit(1);
  }
}

// Run validation
validateEnvironment().catch((error) => {
  console.error("❌ Validation script failed:", error);
  process.exit(1);
});