#!/usr/bin/env tsx
/**
 * Production startup script that ensures Prisma client is in sync with database
 * This runs migrations, regenerates Prisma client, then starts the services
 */

import { execSync, exec } from "child_process";

async function startProduction() {
  console.log("🚀 Starting production services...");

  try {
    // Log environment status
    console.log("🔍 Environment check:");
    console.log("  - NODE_ENV:", process.env.NODE_ENV);
    console.log("  - DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");
    console.log("  - Working directory:", process.cwd());

    // Step 1: Sync database schema
    // Using db:push instead of migrate deploy to avoid migration history issues
    console.log("📦 Syncing database schema...");
    try {
      execSync("pnpm db:push", {
        stdio: "inherit",
        env: process.env,
      });
      console.log("✅ Database schema synced");
    } catch (error: any) {
      console.error("❌ Database sync failed:");
      console.error("Exit code:", error.status);
      console.error("Command:", error.cmd);
      throw error;
    }

    // Step 2: Regenerate Prisma client to match current schema
    console.log("🔧 Regenerating Prisma client...");
    try {
      execSync("pnpm db:generate", {
        stdio: "inherit",
        env: process.env,
      });
      console.log("✅ Prisma client regenerated");
    } catch (error: any) {
      console.error("❌ Prisma client generation failed:");
      console.error("Exit code:", error.status);
      console.error("Command:", error.cmd);
      throw error;
    }

    // Step 3: Start the services with concurrently
    console.log("🚀 Starting API and Bot services...");

    // Use exec instead of spawn for better shell command handling
    const services = exec(
      'npx concurrently -n api,bot -c blue,green "pnpm --filter @ticketsbot/api start" "pnpm --filter @ticketsbot/bot start"',
      {
        env: process.env,
      }
    );

    // Pipe stdout and stderr to parent process
    if (services.stdout) services.stdout.pipe(process.stdout);
    if (services.stderr) services.stderr.pipe(process.stderr);

    // Handle graceful shutdown
    process.on("SIGTERM", () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully...");
      services.kill("SIGTERM");
    });

    process.on("SIGINT", () => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      services.kill("SIGINT");
    });

    // Wait for services to exit
    services.on("exit", (code) => {
      console.log(`Services exited with code ${code}`);
      process.exit(code || 0);
    });
  } catch (error) {
    console.error("❌ Failed to start production services:", error);
    process.exit(1);
  }
}

// Run the startup script
startProduction().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
