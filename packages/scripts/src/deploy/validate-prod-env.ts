#!/usr/bin/env tsx

/**
 * Validates production environment variables
 * Used before deploying to ensure all required variables are set
 */

import { z } from "zod";
import { loadAndValidateEnv, EnvSchema } from "@ticketsbot/core/env";

const ProductionEnvSchema = EnvSchema.extend({
  NODE_ENV: z.literal("production"),
  BASE_DOMAIN: z.string().min(1, "BASE_DOMAIN is required in production"),
});

async function validateProductionEnvironment() {
  console.log("🔍 Validating production environment...\n");

  try {
    // Check if we're in production mode
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️  NODE_ENV is not set to 'production'");
      console.warn("   This validation is meant for production environments\n");
    }

    // Validate required production environment
    const env = loadAndValidateEnv(ProductionEnvSchema);

    console.log("✅ Production environment validation passed!\n");
    
    // Show deployment readiness
    console.log("📋 Deployment Configuration:");
    console.log(`   - Environment: ${env.NODE_ENV}`);
    console.log(`   - Base Domain: ${env.BASE_DOMAIN}`);
    console.log(`   - Database: ${env.DATABASE_URL ? "✓ Configured" : "✗ Missing"}`);
    console.log(`   - Discord Bot: ${env.DISCORD_TOKEN ? "✓ Configured" : "✗ Missing"}`);
    console.log(`   - Auth Secret: ${env.BETTER_AUTH_SECRET ? "✓ Configured" : "✗ Missing"}`);
    console.log(`   - Redis: ${env.REDIS_URL ? "✓ Configured" : "◯ Optional"}`);
    
    // Platform-specific checks
    const platform = process.argv[2];
    if (platform === "render") {
      console.log("\n🚀 Render Deployment Check:");
      console.log(`   - API Port: ${process.env.API_PORT || "3001"}`);
      console.log(`   - Bot Port: ${process.env.BOT_PORT || "3002"}`);
    } else if (platform === "vercel") {
      console.log("\n🚀 Vercel Deployment Check:");
      console.log(`   - API URL: ${process.env.NEXT_PUBLIC_API_URL || "Not set"}`);
      console.log(`   - Feature Flags: ${JSON.stringify({
        newTicketUI: process.env.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI || "false",
        bulkActions: process.env.NEXT_PUBLIC_FEATURE_BULK_ACTIONS || "false",
        advancedForms: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_FORMS || "false",
      }, null, 2)}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Production environment validation failed!\n");

    if (error instanceof Error) {
      console.error(error.message);
    }

    console.error("\n💡 For production deployments:");
    console.error("   - Ensure all required environment variables are set");
    console.error("   - Check BASE_DOMAIN is configured");
    console.error("   - Verify database and Discord credentials");
    console.error("   - Run 'pnpm env:validate --example' to see required variables");

    process.exit(1);
  }
}

validateProductionEnvironment();