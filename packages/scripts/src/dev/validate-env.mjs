#!/usr/bin/env node

import { 
  loadAndValidateEnv, 
  formatEnvForLogging,
  EnvSchema,
  transformEnv,
  getEnvironmentSummary
} from "@ticketsbot/core/env";

async function validateEnvironment() {
  console.log("🔍 Validating environment variables...\n");

  try {
    // Validate required environment
    const baseEnv = loadAndValidateEnv(EnvSchema);
    
    // Transform to complete configuration
    const env = transformEnv(baseEnv);

    console.log("✅ Environment validation passed!");
    
    // Show which values were derived
    const derived = [];
    if (!baseEnv.WEB_URL) derived.push("WEB_URL");
    if (!baseEnv.API_URL) derived.push("API_URL");
    if (!baseEnv.WEB_PORT) derived.push("WEB_PORT");
    if (!baseEnv.API_PORT) derived.push("API_PORT");
    if (!baseEnv.BOT_PORT) derived.push("BOT_PORT");
    if (!baseEnv.DISCORD_REDIRECT_URI) derived.push("DISCORD_REDIRECT_URI");
    
    if (derived.length > 0) {
      console.log(`\n🔧 Derived values: ${derived.join(", ")}`);
    }

    // Display environment summary
    console.log(getEnvironmentSummary(env));

    if (process.argv.includes("--verbose")) {
      console.log("\n📋 Full Environment (secrets redacted):");
      console.log(formatEnvForLogging(env));
    }
    
    if (process.argv.includes("--example")) {
      console.log("\n📝 Example .env configuration:");
      console.log("```");
      console.log(await import("@ticketsbot/core/env").then(m => m.ENV_EXAMPLE));
      console.log("```");
    }

    return true;
  } catch (error) {
    console.error("❌ Environment validation failed!\n");

    if (error instanceof Error) {
      console.error(error.message);
    }

    console.error("\n💡 Tips:");
    console.error("   - Only essential environment variables are required");
    console.error("   - Check that .env file exists");
    console.error("   - Run 'pnpm env:setup dev' to generate .env file");
    console.error("   - Run 'pnpm env:validate --example' to see example .env configuration");
    console.error("   - Ensure PostgreSQL URLs start with postgresql:// or postgres://");
    console.error("   - Ensure Redis URLs start with redis:// or rediss://");

    process.exit(1);
  }
}

validateEnvironment().catch((error) => {
  console.error("❌ Validation script failed:", error);
  process.exit(1);
});
