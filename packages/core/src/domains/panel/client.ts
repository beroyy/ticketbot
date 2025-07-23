/**
 * Client-safe exports from the panel domain
 * Only exports schemas and types that are safe for browser environments
 */

// Export all schemas and types from schemas.ts
export {
  PanelTypeSchema,
  CreatePanelSchema,
  UpdatePanelSchema,
  PanelQuerySchema,
  type PanelType,
  type CreatePanelInput,
  type UpdatePanelInput,
  type PanelQuery,
} from "./schemas";