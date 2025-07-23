// Re-export client and types
export { prisma } from "./client";
// Keep the barrel export from @prisma/client since it's an external package
// and many different types are used throughout the codebase
export * from "@prisma/client";

// Re-export services
export { type CacheService, cacheService, CacheKeys, CacheTTL, cacheMetrics } from "./services/cache";

export {
  type ValidationResult,
  type ValidationError,
  ValidationService,
  validated,
  z,
  ZodError,
  type ZodSchema,
} from "./services/validation";
