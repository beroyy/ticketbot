#!/usr/bin/env tsx
/**
 * Start Redis for development
 * Uses Docker to run Redis on the configured port
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../..");

// Load .env to get Redis port
const envPath = path.join(rootDir, ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ No .env file found. Run 'pnpm env:setup' first.");
  process.exit(1);
}

// Simple env parser
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const [key, ...valueParts] = trimmed.split("=");
    if (key) {
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");
      envVars[key] = value;
    }
  }
});

const redisPort = envVars.REDIS_PORT || "6379";
const worktreeId = envVars.WORKTREE_ID || "default";
const containerName = `ticketsbot-redis-${worktreeId}`;

console.log(`🚀 Starting Redis on port ${redisPort}...`);

try {
  // Check if container already exists
  const existingContainer = execSync(
    `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`,
    { encoding: "utf-8" }
  ).trim();

  if (existingContainer) {
    // Check if it's running
    const isRunning = execSync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, {
      encoding: "utf-8",
    }).trim();

    if (isRunning) {
      console.log(
        `✅ Redis is already running in container '${containerName}' on port ${redisPort}`
      );
    } else {
      console.log(`🔄 Starting existing Redis container '${containerName}'...`);
      execSync(`docker start ${containerName}`);
      console.log(`✅ Redis started successfully on port ${redisPort}`);
    }
  } else {
    // Create and start new container
    console.log(`📦 Creating new Redis container '${containerName}'...`);
    execSync(`docker run -d --name ${containerName} -p ${redisPort}:6379 redis:7-alpine`, {
      stdio: "inherit",
    });
    console.log(`✅ Redis started successfully on port ${redisPort}`);
  }

  // Test connection
  console.log("🔍 Testing Redis connection...");
  execSync(`docker exec ${containerName} redis-cli ping`, { stdio: "inherit" });
  console.log("✅ Redis is ready!");
} catch (error) {
  console.error("❌ Failed to start Redis:", error);
  console.error("\nMake sure Docker is running and you have the necessary permissions.");
  process.exit(1);
}
