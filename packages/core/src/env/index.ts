// Minimal environment module for compatibility with existing scripts
// This module exists only to prevent import errors during the migration

export { z } from "zod";

// These functions are no longer needed but kept for compatibility
export function validateEnv(schema: any, env: any) {
  return schema.parse(env);
}

export function loadAndValidateEnv(schema: any) {
  return schema.parse(process.env);
}

export function formatEnvForLogging(env: any) {
  return JSON.stringify(env, null, 2);
}
