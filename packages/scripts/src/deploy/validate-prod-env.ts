#!/usr/bin/env tsx

/**
 * Validates production environment variables
 * Used before deploying to ensure all required variables are set
 */

import { z } from "zod";

// Custom stringbool type for parsing "true"/"false" strings to boolean
const stringbool = () => z.string().transform((val) => val === "true");

// Production environment schema
const ProductionEnvSchema = z.object({
  // Core configuration
  NODE_ENV: z.literal("production"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  
  // Discord configuration
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().regex(/^\d+$/),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  
  // URLs (required)
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),
  
  // Optional services
  REDIS_URL: z.string().url().optional(),
  
  // Deployment specific (optional)
  API_PORT: z.coerce.number().int().positive().optional(),
  BOT_PORT: z.coerce.number().int().positive().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  
  // Feature flags
  NEXT_PUBLIC_FEATURE_NEW_TICKET_UI: stringbool().optional(),
  NEXT_PUBLIC_FEATURE_BULK_ACTIONS: stringbool().optional(),
  NEXT_PUBLIC_FEATURE_ADVANCED_FORMS: stringbool().optional(),
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
    const env = ProductionEnvSchema.parse(process.env);

    console.log("✅ Production environment validation passed!\n");
    
    // Show deployment readiness
    console.log("📋 Deployment Configuration:");
    console.log(`   - Environment: ${env.NODE_ENV}`);
    console.log(`   - Database: ${env.DATABASE_URL ? "✓ Configured" : "✗ Missing"}`);
    console.log(`   - Discord Bot: ${env.DISCORD_TOKEN ? "✓ Configured" : "✗ Missing"}`);
    console.log(`   - Auth Secret: ${env.BETTER_AUTH_SECRET ? "✓ Configured" : "✗ Missing"}`);
    console.log(`   - Redis: ${env.REDIS_URL ? "✓ Configured" : "◯ Optional"}`);
    
    // Platform-specific checks
    const platform = process.argv[2];
    if (platform === "render") {
      console.log("\n🚀 Render Deployment Check:");
      console.log(`   - API Port: ${env.API_PORT || 3001}`);
      console.log(`   - Bot Port: ${env.BOT_PORT || 3002}`);
      console.log(`   - URLs: ${env.API_URL}, ${env.WEB_URL}`);
    } else if (platform === "vercel") {
      console.log("\n🚀 Vercel Deployment Check:");
      console.log(`   - API URL: ${env.NEXT_PUBLIC_API_URL || "Not set"}`);
      console.log(`   - Feature Flags: ${JSON.stringify({
        newTicketUI: env.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI || false,
        bulkActions: env.NEXT_PUBLIC_FEATURE_BULK_ACTIONS || false,
        advancedForms: env.NEXT_PUBLIC_FEATURE_ADVANCED_FORMS || false,
      }, null, 2)}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Production environment validation failed!\n");

    if (error instanceof z.ZodError) {
      console.error("Validation errors:");
      error.issues.forEach((issue) => {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
      });
    }

    console.error("\n💡 For production deployments:");
    console.error("   - Ensure all required environment variables are set");
    console.error("   - Verify database and Discord credentials");
    console.error("   - Check that URLs are properly configured");

    process.exit(1);
  }
}

validateProductionEnvironment();