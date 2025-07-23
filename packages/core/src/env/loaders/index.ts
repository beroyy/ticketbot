/**
 * Environment loaders
 */

export { type DotenvOptions, loadDotenv, loadEnvFile } from "./dotenv";

/**
 * Get environment variable with fallback
 */
export const getEnv = (key: string, fallback?: string): string | undefined => {
  return process.env[key] || fallback;
};

/**
 * Get required environment variable
 */
export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Parse boolean environment variable
 */
export const getBooleanEnv = (key: string, fallback = false): boolean => {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === "true";
};

/**
 * Parse number environment variable
 */
export const getNumberEnv = (key: string, fallback?: number): number | undefined => {
  const value = process.env[key];
  if (!value) return fallback;

  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }

  return parsed;
};
