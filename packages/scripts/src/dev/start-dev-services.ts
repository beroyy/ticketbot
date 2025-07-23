#!/usr/bin/env tsx
/**
 * Start all development services including Redis
 * This ensures Redis is running before starting the Node.js apps
 */

import { spawn, execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../..");

async function startServices() {
  console.log("🚀 Starting development services...\n");

  try {
    // 1. Run env setup
    console.log("📋 Setting up environment...");
    execSync("tsx packages/scripts/src/dev/env-setup.ts dev", {
      cwd: rootDir,
      stdio: "inherit",
    });

    // 2. Start Redis
    console.log("\n🔴 Starting Redis...");
    execSync("tsx packages/scripts/src/dev/start-redis.ts", {
      cwd: rootDir,
      stdio: "inherit",
    });

    // 3. Start Node.js services with Turbo
    console.log("\n🏗️  Starting Node.js services...");
    const turbo = spawn("pnpm", ["turbo", "run", "dev"], {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
    });

    // Handle graceful shutdown
    const shutdown = () => {
      console.log("\n\n🛑 Shutting down services...");
      turbo.kill("SIGTERM");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    turbo.on("exit", (code) => {
      console.log(`Turbo exited with code ${code}`);
      process.exit(code || 0);
    });
  } catch (error) {
    console.error("❌ Failed to start services:", error);
    process.exit(1);
  }
}

startServices();
