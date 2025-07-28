// Re-export client
export { prisma } from "./client";

// Re-export services
export {
  type ValidationResult,
  type ValidationError,
  ValidationService,
  validated,
  z,
  ZodError,
  type ZodSchema,
} from "./services/validation";
