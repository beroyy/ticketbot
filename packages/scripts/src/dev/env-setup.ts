#!/usr/bin/env tsx
/**
 * Environment Setup Script
 * Handles environment-specific configuration loading and validation
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import net from "net";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { validateEnv, z } from "@ticketsbot/core/env";

// ===================================
// Type Definitions
// ===================================

interface EnvVars {
  NODE_ENV: string;
  TURBO_ENV: string;
  PORT_LEVEL: string;
  AUTO_PORT_DETECTION?: string;
  NEON_PROJECT_ID?: string;
  NEON_API_KEY?: string;
  NEON_PARENT_BRANCH?: string;
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  NEON_BRANCH_NAME?: string;
  GIT_BRANCH_NAME?: string;
  WEB_PORT?: number;
  API_PORT?: number;
  BOT_PORT?: number;
  WEB_URL?: string;
  API_URL?: string;
  NEXT_PUBLIC_API_URL?: string;
  WORKTREE_ID?: string;
  DEV_GUILD_ID?: string;
  DEV_PERMISSIONS_HEX?: string;
  [key: string]: string | number | undefined;
}

interface NeonConfig {
  NEON_PROJECT_ID?: string;
  NEON_API_KEY?: string;
  NEON_PARENT_BRANCH: string;
}

interface BranchInfo {
  branchName: string;
  isNew: boolean;
}

interface ConnectionStrings {
  pooled: string;
  direct: string;
}

interface PortConfig {
  PORT_LEVEL: string;
  WEB_PORT: number;
  API_PORT: number;
  BOT_PORT: number;
  WEB_URL: string;
  API_URL: string;
  NEXT_PUBLIC_API_URL: string;
  REDIS_URL: string;
  WORKTREE_ID: string;
}

// ===================================
// Constants
// ===================================

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ENVIRONMENTS = ["dev", "staging", "prod"] as const;
type Environment = (typeof ENVIRONMENTS)[number];

const ROOT_DIR = path.join(__dirname, "../../../..");

// ===================================
// Validation Schema
// ===================================

const EnvSetupSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  TURBO_ENV: z.enum(["dev", "staging", "prod"]),
  PORT_LEVEL: z.string().transform(Number).pipe(z.number().positive()),
  AUTO_PORT_DETECTION: z.string().optional(),
  NEON_PROJECT_ID: z.string().optional(),
  NEON_API_KEY: z.string().optional(),
  NEON_PARENT_BRANCH: z.string().optional(),
});

// ===================================
// Environment File Loading
// ===================================

function loadEnvFile(env: Environment): EnvVars {
  const envPath = path.join(ROOT_DIR, `.env.${env}`);

  if (!fs.existsSync(envPath)) {
    console.error(`❌ Environment file .env.${env} not found`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const envVars: EnvVars = {} as EnvVars;

  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  });

  return envVars;
}

// ===================================
// Git Branch Detection
// ===================================

function getBranchName(): string {
  // Check for explicit override first (Docker/CI environments)
  if (process.env.NEON_BRANCH_NAME) {
    console.log(`📌 Using explicit branch name: ${process.env.NEON_BRANCH_NAME}`);
    return process.env.NEON_BRANCH_NAME;
  }

  // Try git detection (local development)
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
      cwd: ROOT_DIR,
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (branch) {
      return branch;
    }
  } catch (_error) {
    // Git command failed - likely in Docker or CI
  }

  // Fallback to environment-based naming
  const fallbackName = `docker-${process.env.TURBO_ENV || "dev"}`;
  console.log(`📋 Using fallback branch name: ${fallbackName}`);
  return fallbackName;
}

function sanitizeBranchName(branchName: string): string {
  // Convert git branch name to valid Neon branch name
  // Replace invalid characters with hyphens, lowercase
  return branchName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 63); // Neon branch name max length
}

// ===================================
// Neon Database Management
// ===================================

async function createNeonBranchIfNeeded(
  branchName: string,
  parentBranch: string,
  neonConfig: NeonConfig
): Promise<BranchInfo> {
  const sanitizedName = sanitizeBranchName(branchName);

  if (!neonConfig.NEON_PROJECT_ID || !neonConfig.NEON_API_KEY) {
    console.warn("⚠️  Neon configuration missing, skipping branch creation");
    return { branchName: sanitizedName, isNew: false };
  }

  try {
    // Check if branch exists
    const checkCommand = `neonctl branches list --project-id "${neonConfig.NEON_PROJECT_ID}" --api-key "${neonConfig.NEON_API_KEY}" --output json`;
    const branchesOutput = execSync(checkCommand, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const branches = JSON.parse(branchesOutput);

    const branchExists = branches.some((b: any) => b.name === sanitizedName);

    if (!branchExists) {
      console.log(`🌿 Creating Neon branch: ${sanitizedName}`);
      const createCommand = `neonctl branches create --name "${sanitizedName}" --parent "${parentBranch}" --project-id "${neonConfig.NEON_PROJECT_ID}" --api-key "${neonConfig.NEON_API_KEY}"`;
      execSync(createCommand, { stdio: ["pipe", "pipe", "inherit"] });
      console.log(`✅ Created Neon branch: ${sanitizedName}`);
      return { branchName: sanitizedName, isNew: true };
    } else {
      console.log(`📋 Using existing Neon branch: ${sanitizedName}`);
      return { branchName: sanitizedName, isNew: false };
    }
  } catch (error) {
    console.error("❌ Failed to manage Neon branch:", (error as Error).message);
    console.warn("⚠️  Falling back to parent branch");
    return { branchName: parentBranch, isNew: false };
  }
}

async function generateNeonConnectionStrings(
  branchName: string,
  neonConfig: NeonConfig
): Promise<ConnectionStrings> {
  if (!neonConfig.NEON_PROJECT_ID || !neonConfig.NEON_API_KEY) {
    console.warn("⚠️  Neon configuration missing, using placeholder URLs");
    return {
      pooled: "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
      direct: "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
    };
  }

  try {
    // Get pooled connection string
    const pooledCommand = `neonctl connection-string "${branchName}" --project-id "${neonConfig.NEON_PROJECT_ID}" --api-key "${neonConfig.NEON_API_KEY}" --pooled`;
    const pooledUrl = execSync(pooledCommand, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    // Get direct connection string
    const directCommand = `neonctl connection-string "${branchName}" --project-id "${neonConfig.NEON_PROJECT_ID}" --api-key "${neonConfig.NEON_API_KEY}"`;
    const directUrl = execSync(directCommand, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    // Add timeout parameters
    const timeoutParams = "connect_timeout=15&pool_timeout=20";
    const directTimeoutParams = "connect_timeout=15";

    const pooledWithTimeouts = pooledUrl.includes("?")
      ? `${pooledUrl}&${timeoutParams}`
      : `${pooledUrl}?${timeoutParams}`;

    const directWithTimeouts = directUrl.includes("?")
      ? `${directUrl}&${directTimeoutParams}`
      : `${directUrl}?${directTimeoutParams}`;

    return {
      pooled: pooledWithTimeouts,
      direct: directWithTimeouts,
    };
  } catch (error) {
    console.error("❌ Failed to get Neon connection strings:", (error as Error).message);
    return {
      pooled: "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
      direct: "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
    };
  }
}

// ===================================
// Port Management
// ===================================

function getWorktreeId(): string {
  try {
    // Get the absolute path to the git worktree root
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      cwd: ROOT_DIR,
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    // Generate a short hash from the worktree path for consistent port assignment
    const hash = crypto.createHash("sha256").update(gitRoot).digest("hex");
    return hash.substring(0, 8);
  } catch (_error) {
    // Fallback for non-git environments or errors
    const projectPath = path.resolve(ROOT_DIR);
    const hash = crypto.createHash("sha256").update(projectPath).digest("hex");
    return hash.substring(0, 8);
  }
}

async function getDockerPortConflicts(): Promise<number[]> {
  try {
    // Get running Docker containers and their port mappings
    const dockerCommand = 'docker ps --format "{{.Ports}}"';
    const dockerOutput = execSync(dockerCommand, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    const usedPorts = new Set<number>();

    if (dockerOutput) {
      const portLines = dockerOutput.split("\n");
      portLines.forEach((line) => {
        // Parse Docker port mappings like "0.0.0.0:4000->4000/tcp, 0.0.0.0:4001->4001/tcp"
        const portMatches = line.match(/0\.0\.0\.0:(\d+)->/g);
        if (portMatches) {
          portMatches.forEach((match) => {
            const portMatch = match.match(/:(\d+)->/);
            if (portMatch) {
              const port = parseInt(portMatch[1]!);
              usedPorts.add(port);
            }
          });
        }
      });
    }

    return Array.from(usedPorts);
  } catch (_error) {
    // Docker not available or no containers running
    return [];
  }
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

function isReservedPortLevel(level: number): boolean {
  const webPort = level * 1000;
  // Check for known reserved ports
  const reservedPorts = [
    6000, // X11
    8000, // Common web server
    3000, // Common dev server (but we allow it)
  ];

  return reservedPorts.includes(webPort);
}

async function findAvailablePortLevel(
  startingLevel: number = 4,
  maxAttempts: number = 15
): Promise<number> {
  console.log(`🔍 Checking port availability starting at level ${startingLevel}...`);

  // Get Docker port conflicts
  const dockerConflicts = await getDockerPortConflicts();
  if (dockerConflicts.length > 0) {
    console.log(`🐳 Found Docker port conflicts: ${dockerConflicts.join(", ")}`);
  }

  for (let level = startingLevel; level <= startingLevel + maxAttempts; level++) {
    // Skip reserved port levels
    if (isReservedPortLevel(level)) {
      console.log(`⚠️  Skipping level ${level} (port ${level * 1000} is reserved)`);
      continue;
    }

    const webPort = level * 1000;
    const apiPort = level * 1000 + 1;
    const botPort = level * 1000 + 2;
    const redisPort = level * 1000 + 379;

    // Check if Redis is already running on the expected port
    const redisRunning = dockerConflicts.includes(redisPort) || (await isPortInUse(redisPort));

    // Only check Node.js service ports for conflicts
    const nodeServicePorts = [webPort, apiPort, botPort];
    const conflicts: number[] = [];

    // Check both local process conflicts and Docker conflicts
    for (const port of nodeServicePorts) {
      if (dockerConflicts.includes(port) || (await isPortInUse(port))) {
        conflicts.push(port);
      }
    }

    // If Redis is expected to be on this port but isn't running, that's fine
    // We'll start it later. Only report if Redis is on a different port level
    if (redisRunning && level === startingLevel) {
      console.log(`🔴 Redis already running on port ${redisPort} (good!)`);
    }

    if (conflicts.length === 0) {
      if (level !== startingLevel) {
        console.log(
          `✅ Found available ports at level ${level} (${webPort}, ${apiPort}, ${botPort}, Redis: ${redisPort}${redisRunning ? " - already running" : ""})`
        );
      } else {
        console.log(
          `✅ Using default ports at level ${level} (${webPort}, ${apiPort}, ${botPort}, Redis: ${redisPort}${redisRunning ? " - already running" : ""})`
        );
      }
      return level;
    } else {
      console.log(`⚠️  Level ${level} has conflicts on ports: ${conflicts.join(", ")}`);
    }
  }

  console.warn(
    `❌ Could not find available ports after ${maxAttempts} attempts. Using level ${
      startingLevel + maxAttempts
    } anyway.`
  );
  return startingLevel + maxAttempts;
}

async function calculatePorts(envVars: EnvVars): Promise<PortConfig> {
  // Always start with PORT_LEVEL from env var or default to 4
  const requestedLevel = parseInt(envVars.PORT_LEVEL) || 4;

  // Check if auto-detection should be used
  const useAutoDetection = envVars.AUTO_PORT_DETECTION !== "false";

  let actualLevel: number;
  if (useAutoDetection) {
    // Find available port level starting from requested level
    actualLevel = await findAvailablePortLevel(requestedLevel);
  } else {
    actualLevel = requestedLevel;
    console.log(`📋 Using fixed port level ${actualLevel} (auto-detection disabled)`);
  }

  const webPort = actualLevel * 1000;
  const apiPort = actualLevel * 1000 + 1;
  const botPort = actualLevel * 1000 + 2;
  const redisPort = actualLevel * 1000 + 379; // e.g., 4379 for level 4

  return {
    PORT_LEVEL: actualLevel.toString(),
    WEB_PORT: webPort,
    API_PORT: apiPort,
    BOT_PORT: botPort,
    WEB_URL: `http://localhost:${webPort}`,
    API_URL: `http://localhost:${apiPort}`,
    NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}`,
    REDIS_URL: `redis://localhost:${redisPort}`,
    WORKTREE_ID: getWorktreeId(),
  };
}

// ===================================
// Environment Validation
// ===================================

function validateEnvSetup(env: Environment, envVars: EnvVars): boolean {
  try {
    // Use zod schema for validation
    validateEnv(EnvSetupSchema, envVars);

    // Additional environment-specific validation
    if (env === "dev" && envVars.NODE_ENV !== "development") {
      console.error(`❌ Dev environment should have NODE_ENV=development, got ${envVars.NODE_ENV}`);
      return false;
    }

    if ((env === "staging" || env === "prod") && envVars.NODE_ENV !== "production") {
      console.error(
        `❌ ${env} environment should have NODE_ENV=production, got ${envVars.NODE_ENV}`
      );
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Environment validation failed: ${error.message}`);
    }
    return false;
  }
}

// ===================================
// Formatted .env File Generation
// ===================================

function generateFormattedEnvContent(vars: EnvVars): string {
  const sections: string[] = [];

  // Core Settings
  sections.push(`# === Core Settings ===
NODE_ENV="${vars.NODE_ENV}"
TURBO_ENV="${vars.TURBO_ENV}"
WORKTREE_ID="${vars.WORKTREE_ID}"
GIT_BRANCH_NAME="${vars.GIT_BRANCH_NAME}"`);

  // Database
  const databaseSection: string[] = [
    `# === Database ===
DATABASE_URL="${vars.DATABASE_URL}"
DIRECT_URL="${vars.DIRECT_URL}"
NEON_BRANCH_NAME="${vars.NEON_BRANCH_NAME}"`,
  ];

  if (vars.NEON_PROJECT_ID) {
    databaseSection.push(`NEON_PROJECT_ID="${vars.NEON_PROJECT_ID}"
NEON_API_KEY="${vars.NEON_API_KEY}"
NEON_PARENT_BRANCH="${vars.NEON_PARENT_BRANCH || "main"}"`);
  }

  if (vars.MAIN_BRANCH_DATABASE_URL) {
    databaseSection.push(`MAIN_BRANCH_DATABASE_URL="${vars.MAIN_BRANCH_DATABASE_URL}"`);
  }

  sections.push(databaseSection.join("\n"));

  // Services
  const servicesSection: string[] = [
    `# === Services ===
PORT_LEVEL="${vars.PORT_LEVEL}"
AUTO_PORT_DETECTION="${vars.AUTO_PORT_DETECTION || "true"}"
WEB_PORT="${vars.WEB_PORT}"
API_PORT="${vars.API_PORT}"
BOT_PORT="${vars.BOT_PORT}"
WEB_URL="${vars.WEB_URL}"
API_URL="${vars.API_URL}"
NEXT_PUBLIC_API_URL="${vars.NEXT_PUBLIC_API_URL}"`,
  ];

  if (vars.API_HOST) {
    servicesSection.push(`API_HOST="${vars.API_HOST}"`);
  }

  if (vars.API_SECRET) {
    servicesSection.push(`API_SECRET="${vars.API_SECRET}"`);
  }

  if (vars.REDIS_URL || vars.REDIS_PORT) {
    servicesSection.push(`REDIS_URL="${vars.REDIS_URL || "redis://localhost:6379"}"
REDIS_PORT="${vars.REDIS_PORT || "6379"}"`);
  }

  sections.push(servicesSection.join("\n"));

  // Authentication
  const authSection: string[] = [`# === Authentication ===`];

  if (vars.DISCORD_CLIENT_ID) {
    authSection.push(`DISCORD_CLIENT_ID="${vars.DISCORD_CLIENT_ID}"
DISCORD_CLIENT_SECRET="${vars.DISCORD_CLIENT_SECRET || ""}"
DISCORD_TOKEN="${vars.DISCORD_TOKEN || ""}"
NEXT_PUBLIC_GUILD_ID="${vars.NEXT_PUBLIC_GUILD_ID || ""}"`);
  }

  if (vars.BETTER_AUTH_SECRET) {
    authSection.push(`BETTER_AUTH_SECRET="${vars.BETTER_AUTH_SECRET}"`);
  }

  if (authSection.length > 1) {
    sections.push(authSection.join("\n"));
  }

  // Development
  const devSection: string[] = [
    `# === Development ===
LOG_LEVEL="${vars.LOG_LEVEL || "info"}"`,
  ];

  if (vars.DEV_PERMISSIONS_HEX) {
    devSection.push(`DEV_PERMISSIONS_HEX="${vars.DEV_PERMISSIONS_HEX}"`);
  }

  if (vars.DEV_GUILD_ID) {
    devSection.push(`DEV_GUILD_ID="${vars.DEV_GUILD_ID}"`);
  }

  devSection.push(`DEV_ADMIN_PERMS="${vars.DEV_ADMIN_PERMS || "false"}"`);

  if (vars.DEV_DB_AUTO_SEED) {
    devSection.push(`DEV_DB_AUTO_SEED="${vars.DEV_DB_AUTO_SEED}"`);
  }

  if (vars.PERMISSION_CACHE_TTL) {
    devSection.push(`PERMISSION_CACHE_TTL="${vars.PERMISSION_CACHE_TTL}"
DEFAULT_ROLES_CACHE_TTL="${vars.DEFAULT_ROLES_CACHE_TTL || "3600000"}"
USER_ROLES_CACHE_TTL="${vars.USER_ROLES_CACHE_TTL || "300000"}"
COOKIE_CACHE_MAX_AGE="${vars.COOKIE_CACHE_MAX_AGE || "300"}"`);
  }

  sections.push(devSection.join("\n"));

  return sections.join("\n\n");
}

// ===================================
// Main Setup Function
// ===================================

async function setupEnvironment(targetEnv: Environment): Promise<void> {
  if (!ENVIRONMENTS.includes(targetEnv)) {
    console.error(
      `❌ Invalid environment: ${targetEnv}. Must be one of: ${ENVIRONMENTS.join(", ")}`
    );
    process.exit(1);
  }

  console.log(`🔧 Setting up ${targetEnv} environment...`);

  // Load and validate environment
  const envVars = loadEnvFile(targetEnv);

  if (!validateEnvSetup(targetEnv, envVars)) {
    process.exit(1);
  }

  // Detect branch name (git, explicit, or fallback)
  const branchName = getBranchName();
  console.log(`📂 Using branch name: ${branchName}`);

  // Extract Neon configuration
  const neonConfig: NeonConfig = {
    NEON_PROJECT_ID: envVars.NEON_PROJECT_ID,
    NEON_API_KEY: envVars.NEON_API_KEY,
    NEON_PARENT_BRANCH: envVars.NEON_PARENT_BRANCH || "main",
  };

  // Create or use existing Neon branch
  const branchInfo = await createNeonBranchIfNeeded(
    branchName,
    neonConfig.NEON_PARENT_BRANCH,
    neonConfig
  );

  // Generate DATABASE_URL and DIRECT_URL from Neon branch
  const connectionStrings = await generateNeonConnectionStrings(branchInfo.branchName, neonConfig);

  // Calculate ports from PORT_LEVEL with automatic conflict detection
  const calculatedPorts = await calculatePorts(envVars);

  // Generate API_SECRET if not provided
  const apiSecret = envVars.API_SECRET || crypto.randomBytes(32).toString("base64");

  // Combine all environment variables
  const finalEnvVars: EnvVars = {
    ...envVars,
    ...calculatedPorts,
    DATABASE_URL: connectionStrings.pooled,
    DIRECT_URL: connectionStrings.direct,
    NEON_BRANCH_NAME: branchInfo.branchName,
    GIT_BRANCH_NAME: branchName,
    API_SECRET: apiSecret,
  };

  // Create or update .env file for current session
  const dotEnvPath = path.join(ROOT_DIR, ".env");
  const envContent = generateFormattedEnvContent(finalEnvVars);

  fs.writeFileSync(dotEnvPath, envContent);

  // Initialize database if this is a new branch (but skip for Docker environments)
  // Docker environments will run db:init after containers are started
  const isDockerEnvironment = !!process.env.NEON_BRANCH_NAME;

  if (
    branchInfo.isNew &&
    !isDockerEnvironment &&
    connectionStrings.direct &&
    !connectionStrings.direct.includes("placeholder")
  ) {
    console.log(`🔧 Initializing database branch...`);
    try {
      execSync(`pnpm --filter db db:init`, {
        stdio: "inherit",
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          DATABASE_URL: connectionStrings.pooled,
          DIRECT_URL: connectionStrings.direct,
        },
      });
      console.log(`✅ Database initialization completed for branch: ${branchInfo.branchName}`);

      // Seed database with data from main branch for new branches only
      if (branchInfo.isNew) {
        console.log(`🌱 Seeding data from main branch for new branch: ${branchInfo.branchName}`);
        try {
          execSync(`pnpm db:seed:main`, {
            stdio: "inherit",
            cwd: ROOT_DIR,
            env: {
              ...process.env,
              DATABASE_URL: connectionStrings.pooled,
              DIRECT_URL: connectionStrings.direct,
            },
          });
          console.log(`✅ Database seeding completed for branch: ${branchInfo.branchName}`);
        } catch (seedError) {
          console.error("❌ Database seeding failed:", (seedError as Error).message);
          console.warn("⚠️  Database initialized but no data from main branch added");
          console.warn("   You can manually run: pnpm db:seed:main");
        }
      }
    } catch (error) {
      console.error("❌ Database initialization failed:", (error as Error).message);
      console.warn("⚠️  You may need to run the init script manually");
    }
  } else if (isDockerEnvironment && branchInfo.isNew) {
    console.log(
      `🐳 Docker environment detected - database initialization will run after containers start`
    );
  }

  console.log(`✅ Environment ${targetEnv} loaded successfully`);
  console.log(`📝 Created .env file with ${Object.keys(finalEnvVars).length} variables`);

  // Create symlink for web app
  const webEnvPath = path.join(ROOT_DIR, "apps", "web", ".env");
  try {
    // Remove existing symlink if it exists
    if (fs.existsSync(webEnvPath)) {
      fs.unlinkSync(webEnvPath);
    }
    // Create relative symlink from apps/web/.env to ../../.env
    fs.symlinkSync("../../.env", webEnvPath);
    console.log(`🔗 Created symlink for web app: apps/web/.env → .env`);
  } catch (error) {
    console.warn(`⚠️  Failed to create web app symlink: ${(error as Error).message}`);
    console.warn(`   You may need to manually create the symlink or copy .env to apps/web/`);
  }

  // Output key info
  console.log(`\n📊 Environment Summary:`);
  console.log(`   Environment: ${finalEnvVars.TURBO_ENV}`);
  console.log(`   Node Environment: ${finalEnvVars.NODE_ENV}`);
  console.log(`   Worktree ID: ${finalEnvVars.WORKTREE_ID}`);
  console.log(`   Branch Name: ${finalEnvVars.GIT_BRANCH_NAME}`);
  console.log(
    `   Neon Branch: ${finalEnvVars.NEON_BRANCH_NAME} ${branchInfo.isNew ? "(new)" : "(existing)"}`
  );
  const requestedLevel = parseInt(envVars.PORT_LEVEL) || 4;
  const actualLevel = parseInt(finalEnvVars.PORT_LEVEL);
  if (actualLevel !== requestedLevel) {
    console.log(`   Port Level: ${actualLevel} (auto-adjusted from ${requestedLevel})`);
  } else {
    console.log(`   Port Level: ${actualLevel}`);
  }
  console.log(`   Web Port: ${finalEnvVars.WEB_PORT} → ${finalEnvVars.WEB_URL}`);
  console.log(`   API Port: ${finalEnvVars.API_PORT} → ${finalEnvVars.API_URL}`);
  console.log(`   Bot Port: ${finalEnvVars.BOT_PORT}`);
  console.log(`   Redis Port: ${finalEnvVars.REDIS_PORT}`);
  if (finalEnvVars.DATABASE_URL && !finalEnvVars.DATABASE_URL.includes("placeholder")) {
    console.log(`   Database: Connected to Neon branch${branchInfo.isNew ? " (initialized)" : ""}`);
    console.log(`   Connection Pool: Enabled with timeouts`);
  }

  // Add multi-worktree info and running containers check
  console.log(`\n🔄 Multi-Worktree Support:`);
  console.log(`   This worktree can run simultaneously with others`);
  console.log(`   Each worktree gets unique ports automatically`);
  console.log(`   Docker containers are isolated by worktree ID`);

  // Check for other running worktree containers
  try {
    const dockerContainers = execSync(
      'docker ps --format "{{.Names}}" --filter "name=ticketsbot-dev-"',
      {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }
    ).trim();

    if (dockerContainers) {
      const containers = dockerContainers.split("\n").filter((name) => name.trim());
      const otherContainers = containers.filter(
        (name) => !name.includes(finalEnvVars.WORKTREE_ID!)
      );

      if (otherContainers.length > 0) {
        console.log(`\n🐳 Other Running Worktrees:`);
        otherContainers.forEach((containerName) => {
          const worktreeId = containerName.replace("ticketsbot-dev-", "");
          console.log(`   • ${worktreeId}`);
        });
        console.log(`   Total active worktrees: ${containers.length}`);
      }
    }
  } catch (_error) {
    // Docker not available or no containers running
  }
}

// ===================================
// CLI Entry Point
// ===================================

const targetEnv = process.argv[2] as Environment | undefined;

if (!targetEnv) {
  console.log("Usage: tsx scripts/env-setup.ts <environment>");
  console.log(`Available environments: ${ENVIRONMENTS.join(", ")}`);
  process.exit(1);
}

setupEnvironment(targetEnv).catch((error) => {
  console.error("❌ Environment setup failed:", (error as Error).message);
  process.exit(1);
});
