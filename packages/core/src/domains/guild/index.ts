// Export specific schemas
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

export { UpdateSettingsSchema, type UpdateSettingsInput } from "./api-schemas";

// Export context-aware Guild namespace as the default
export { Guild } from "./index.context";

// Export static methods that don't require context (for bot operations, etc.)
export {
  ensure,
  update,
  findById,
  syncBotInstallStatus,
  getSettingsUnchecked,
  ensureWithDefaults,
  Blacklist,
  getAccessibleGuilds,
} from "./static";
