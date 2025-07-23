/**
 * Client-safe exports from the guild domain
 * Only exports schemas and types that are safe for browser environments
 */

// Export all schemas and types from schemas.ts
export {
  CreateGuildSchema,
  UpdateGuildSchema,
  UpdateGuildSettingsSchema,
  GuildQuerySchema,
  GeneralSettingsSchema,
  AutoCloseSchema,
  OpenCommandsSchema,
  ContextMenuSchema,
  type CreateGuildInput,
  type UpdateGuildInput,
  type UpdateGuildSettingsInput,
  type GuildQuery,
  type GeneralSettingsInput,
  type AutoCloseInput,
  type OpenCommandsInput,
  type ContextMenuInput,
} from "./schemas";

// Export API schemas if they're client-safe
export { UpdateSettingsSchema, type UpdateSettingsInput } from "./api-schemas";