/**
 * Utility to find the monorepo root directory
 */

import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

// Cache the result for performance
let cachedRoot: string | null = null;

/**
 * Find the monorepo root by looking for marker files
 * @param startDir - Directory to start searching from (defaults to current working directory)
 * @returns The monorepo root directory path, or null if not found
 */
export function findMonorepoRoot(startDir: string = process.cwd()): string | null {
  // Return cached result if available
  if (cachedRoot !== null) {
    return cachedRoot;
  }

  let currentDir = startDir;

  // Traverse up the directory tree
  while (currentDir !== dirname(currentDir)) {
    // Check for pnpm-workspace.yaml (pnpm monorepo)
    if (existsSync(join(currentDir, "pnpm-workspace.yaml"))) {
      cachedRoot = currentDir;
      return cachedRoot;
    }

    // Check for yarn workspaces
    if (existsSync(join(currentDir, "yarn.lock"))) {
      const packageJsonPath = join(currentDir, "package.json");
      if (existsSync(packageJsonPath)) {
        try {
          const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
          const packageJson = JSON.parse(packageJsonContent);
          if (packageJson.workspaces) {
            cachedRoot = currentDir;
            return cachedRoot;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Check for npm workspaces
    if (existsSync(join(currentDir, "package-lock.json"))) {
      const packageJsonPath = join(currentDir, "package.json");
      if (existsSync(packageJsonPath)) {
        try {
          const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
          const packageJson = JSON.parse(packageJsonContent);
          if (packageJson.workspaces) {
            cachedRoot = currentDir;
            return cachedRoot;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Check for lerna.json (Lerna monorepo)
    if (existsSync(join(currentDir, "lerna.json"))) {
      cachedRoot = currentDir;
      return cachedRoot;
    }

    // Move up one directory
    currentDir = dirname(currentDir);
  }

  // Not in a monorepo
  return null;
}

/**
 * Clear the cached root (useful for testing)
 */
export function clearRootCache(): void {
  cachedRoot = null;
}
