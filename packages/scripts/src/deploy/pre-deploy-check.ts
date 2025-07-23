#!/usr/bin/env tsx

/**
 * Pre-deployment checks for TicketsBot
 * Ensures the codebase is ready for deployment
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
}

function runCommand(command: string): { success: boolean; output: string } {
  try {
    const output = execSync(command, { encoding: "utf-8", stdio: "pipe" });
    return { success: true, output: output.trim() };
  } catch (error: any) {
    return { success: false, output: error.message };
  }
}

async function runPreDeployChecks(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  
  // Check 1: Git status
  console.log("🔍 Running pre-deployment checks...\n");
  
  const gitStatus = runCommand("git status --porcelain");
  checks.push({
    name: "Git Working Directory",
    passed: gitStatus.output === "",
    message: gitStatus.output === "" ? "Clean" : "Uncommitted changes detected",
  });

  // Check 2: TypeScript compilation
  console.log("📝 Checking TypeScript...");
  const typecheck = runCommand("pnpm typecheck");
  checks.push({
    name: "TypeScript",
    passed: typecheck.success,
    message: typecheck.success ? "No type errors" : "Type errors found",
  });

  // Check 3: Linting
  console.log("🔍 Checking linting...");
  const lint = runCommand("pnpm lint");
  checks.push({
    name: "ESLint",
    passed: lint.success,
    message: lint.success ? "No lint errors" : "Lint errors found",
  });

  // Check 4: Build test
  console.log("🏗️  Testing build...");
  const build = runCommand("pnpm build");
  checks.push({
    name: "Build",
    passed: build.success,
    message: build.success ? "Build successful" : "Build failed",
  });

  // Check 5: Environment files
  const envChecks = [
    { file: ".env.render", name: "Render env example" },
    { file: ".env.vercel", name: "Vercel env example" },
    { file: "DEPLOYMENT.md", name: "Deployment documentation" },
  ];

  for (const { file, name } of envChecks) {
    const exists = existsSync(join(process.cwd(), file));
    checks.push({
      name,
      passed: exists,
      message: exists ? "Found" : "Missing",
    });
  }

  // Check 6: Package versions match
  console.log("📦 Checking package versions...");
  const rootPkg = JSON.parse(readFileSync("package.json", "utf-8"));
  const coreVersion = JSON.parse(readFileSync("packages/core/package.json", "utf-8")).version;
  const apiVersion = JSON.parse(readFileSync("apps/api/package.json", "utf-8")).version;
  const botVersion = JSON.parse(readFileSync("apps/bot/package.json", "utf-8")).version;
  const webVersion = JSON.parse(readFileSync("apps/web/package.json", "utf-8")).version;

  const versionsMatch = [coreVersion, apiVersion, botVersion, webVersion].every(
    (v) => v === rootPkg.version
  );

  checks.push({
    name: "Package Versions",
    passed: versionsMatch,
    message: versionsMatch ? `All at v${rootPkg.version}` : "Version mismatch detected",
  });

  return checks;
}

async function main() {
  const platform = process.argv[2];
  
  if (platform && !["render", "vercel", "all"].includes(platform)) {
    console.error("Usage: pre-deploy-check [render|vercel|all]");
    process.exit(1);
  }

  console.log("🚀 TicketsBot Pre-Deployment Check");
  console.log("================================\n");

  const checks = await runPreDeployChecks();
  
  // Display results
  console.log("\n📊 Results:");
  console.log("----------");
  
  let allPassed = true;
  for (const check of checks) {
    const icon = check.passed ? "✅" : "❌";
    console.log(`${icon} ${check.name}: ${check.message || ""}`);
    if (!check.passed) allPassed = false;
  }

  // Platform-specific advice
  if (platform) {
    console.log(`\n🎯 ${platform.charAt(0).toUpperCase() + platform.slice(1)} Deployment:`);
    
    if (platform === "render" || platform === "all") {
      console.log("\nRender checklist:");
      console.log("  [ ] Environment variables set in Render dashboard");
      console.log("  [ ] PostgreSQL database accessible");
      console.log("  [ ] Discord bot token valid");
      console.log("  [ ] Health check endpoint configured (/health)");
    }
    
    if (platform === "vercel" || platform === "all") {
      console.log("\nVercel checklist:");
      console.log("  [ ] NEXT_PUBLIC_API_URL points to Render deployment");
      console.log("  [ ] Feature flags configured as needed");
      console.log("  [ ] Root directory set correctly in Vercel");
      console.log("  [ ] Build command uses monorepo setup");
    }
  }

  // Final status
  console.log("\n" + "=".repeat(40));
  if (allPassed) {
    console.log("✅ All checks passed! Ready to deploy.");
    process.exit(0);
  } else {
    console.log("❌ Some checks failed. Please fix issues before deploying.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Pre-deploy check failed:", error);
  process.exit(1);
});