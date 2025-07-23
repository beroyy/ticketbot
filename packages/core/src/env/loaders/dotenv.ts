/**
 * Environment loader utilities
 * Note: This no longer loads .env files directly.
 * Use dotenvx CLI to load environment variables before running the application.
 */

export interface DotenvOptions {
  path?: string;
  override?: boolean;
  encoding?: BufferEncoding;
}

/**
 * Legacy dotenv loader - now just returns empty object
 * Environment variables should be loaded via dotenvx CLI
 * @deprecated Use dotenvx CLI to load environment variables
 */
export const loadDotenv = (_options: DotenvOptions = {}) => {
  // No longer loads .env files - dotenvx CLI handles this
  return {};
};

/**
 * Legacy environment file loader - now just returns empty object
 * @deprecated Use dotenvx CLI with -f flag to load specific env files
 */
export const loadEnvFile = (_environment: string) => {
  // No longer loads .env files - dotenvx CLI handles this
  return {};
};
