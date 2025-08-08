#!/usr/bin/env tsx

import { config } from "dotenv";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  checkPostgresConnection,
  checkDatabaseSchema,
} from "./check-services.js";
import { initializeDatabase } from "../db/init-db.js";
import { main as seedDatabase } from "../db/seeders/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../..");
const envPath = path.join(rootDir, ".env");

// Load environment variables from root .env file
config({ path: envPath });

// Parse command line flags
interface Flags {
  help: boolean;
  seed: boolean;
  skipChecks: boolean;
  reset: boolean;
}

function parseFlags(args: string[]): Flags {
  return {
    help: args.includes("--help") || args.includes("-h"),
    seed: args.includes("--seed"),
    skipChecks: args.includes("--skip-checks"),
    reset: args.includes("--reset"),
  };
}

function showHelp() {
  console.log(`
🚀 TicketsBot Development Environment

Usage: pnpm dev [options]

Options:
  --seed          Seed database with test data
  --skip-checks   Skip all service checks (fast start)
  --reset         Reset database before starting
  --help, -h      Show this help message

Default behavior:
  - Checks and initializes PostgreSQL if needed
  - Does NOT seed database (use --seed for test data)

Examples:
  pnpm dev                 # Standard development
  pnpm dev --seed          # Include test data
  pnpm dev --skip-checks   # Fast restart
  pnpm dev --reset --seed  # Fresh start with test data
`);
}

async function waitForService(
  checkFn: () => Promise<boolean>,
  serviceName: string,
  maxAttempts = 10,
  delayMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkFn()) {
      return true;
    }
    if (i < maxAttempts - 1) {
      process.stdout.write(`   Waiting for ${serviceName}...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      process.stdout.write("\r");
    }
  }
  return false;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  // Check .env exists
  if (!fs.existsSync(envPath)) {
    console.error("❌ No .env file found!");
    console.error("📋 Copy .env.example to .env and fill in your values:");
    console.error("\n   cp .env.example .env\n");
    console.error("Then edit .env with your configuration.");
    process.exit(1);
  }

  console.log("🚀 Starting TicketsBot Development Environment...\n");

  try {
    if (!flags.skipChecks) {
      // PostgreSQL checks
      console.log("🔍 Checking PostgreSQL connection...");
      const pgConnected = await checkPostgresConnection();
      if (!pgConnected) {
        console.error("❌ PostgreSQL connection failed!");
        console.error("📋 Make sure PostgreSQL is running and DATABASE_URL is correct");
        console.error("   You can use Neon, Supabase, or local PostgreSQL");
        process.exit(1);
      }
      console.log("✅ PostgreSQL connected");

      // Reset if requested
      if (flags.reset) {
        console.log("\n🔄 Resetting database...");
        try {
          execSync("pnpm --filter @ticketsbot/core db:push:force", {
            stdio: "inherit",
            cwd: rootDir,
          });
          console.log("✅ Database reset complete");
        } catch (error) {
          console.error("❌ Failed to reset database");
          throw error;
        }
      }

      // Check database schema
      console.log("\n🔍 Checking database schema...");
      const schemaExists = await checkDatabaseSchema();
      if (!schemaExists) {
        console.log("📦 Database not initialized. Initializing...");
        await initializeDatabase();
      } else {
        console.log("✅ Database schema ready");
      }


      // Seed if requested
      if (flags.seed) {
        console.log("\n🌱 Seeding database with test data...");
        try {
          await seedDatabase();
          console.log("✅ Database seeded");
        } catch (error) {
          console.error("❌ Seeding failed:", error);
          console.error(
            "   You can continue without test data or fix the issue and run: pnpm db:seed"
          );
        }
      }
    } else {
      console.log("⚡ Skipping all checks (--skip-checks flag)");
    }

    // Start all services
    console.log("\n🚀 Starting all services...\n");
    const turbo = spawn("turbo", ["run", "dev"], {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
    });

    // Handle graceful shutdown
    const shutdown = () => {
      console.log("\n🛑 Shutting down services...");
      turbo.kill("SIGTERM");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    turbo.on("exit", (code) => {
      if (code !== null) {
        process.exit(code);
      }
    });
  } catch (error) {
    console.error("\n❌ Failed to start development environment:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
