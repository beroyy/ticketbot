#!/usr/bin/env tsx

/**
 * Database Initialization Script
 *
 * This script initializes the database schema for TicketsBot.
 * Used by Docker environments and local development setup.
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../../../..");
const coreDir = resolve(rootDir, "packages/core");

const prisma = new PrismaClient();

async function initializeDatabase() {
  console.log("🚀 Initializing database...");

  try {
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connection established");

    // Generate Prisma client
    console.log("🔧 Generating Prisma client...");
    try {
      execSync("pnpm --filter @ticketsbot/core db:generate", {
        stdio: "inherit",
        cwd: rootDir,
      });
      console.log("✅ Prisma client generated");
    } catch (error: any) {
      console.error("❌ Failed to generate Prisma client:", error.message);
      throw error;
    }

    // Run Prisma schema push to ensure latest schema
    console.log("📦 Applying schema changes...");
    try {
      execSync("pnpm --filter @ticketsbot/core db:push", {
        stdio: "inherit",
        cwd: rootDir,
      });
      console.log("✅ Schema changes applied");
    } catch (error: any) {
      console.error("❌ Failed to apply schema changes:", error.message);
      throw error;
    }

    // Verify schema was applied
    console.log("🔍 Verifying schema...");
    try {
      // Run a simple query to verify the schema
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database schema verified");
    } catch (error: any) {
      console.error("❌ Schema verification failed:", error.message);
      throw error;
    }

    console.log("\n🎉 Database initialization completed successfully!");
  } catch (error) {
    console.error("\n❌ Database initialization failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT. Cleaning up...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM. Cleaning up...");
  await prisma.$disconnect();
  process.exit(0);
});

// Run initialization when called directly
initializeDatabase().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { initializeDatabase };
