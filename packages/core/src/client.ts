/**
 * Client-safe exports from @ticketsbot/core
 * This file only exports utilities and schemas that are safe to use in browser environments
 */

// Export common schemas only (not domain-specific ones that might include server code)
export {
  // Schema exports
  DiscordIdSchema,
  DiscordUserIdSchema,
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  CuidSchema,
  TimestampSchema,
  TicketStatusSchema,
  UserRoleSchema,
  PanelTypeSchema,
  FormFieldTypeSchema,
  ActionTypeSchema,
  ColorHexSchema,
  HexColorSchema,
  EmojiSchema,
  UrlSchema,
  JsonSchema,
  PositiveIntSchema,
  NonNegativeIntSchema,
  BigIntStringSchema,
  DiscordUsernameSchema,
  DiscordDiscriminatorSchema,
  PrioritySchema,
  JsonMetadataSchema,
  PaginationSchema,
  DateRangeSchema,
  // Type exports
  type DiscordId,
  type TicketStatus,
  type UserRole,
  type PanelType,
  type FormFieldType,
  type ActionType,
  type Priority,
} from "./schemas/common";

// Export permissions - avoiding duplicate exports by importing from permissions.ts
// which already re-exports from permissions-constants
import { PermissionUtils } from "./permissions/utils";
export { PermissionUtils };

// Export permission constants directly from permissions-constants
export {
  PermissionFlags,
  type PermissionFlag,
  type PermissionValue,
  ALL_PERMISSIONS,
  PermissionCategories,
  DefaultRolePermissions,
} from "./permissions/constants";

// Export client-safe utilities
export {
  // Interfaces
  type BotConfig,
  type TicketEmbedOptions,
  // Functions
  formatDuration,
  parseDiscordId,
  formatDiscordId,
  createTicketChannelName,
  createTicketThreadName,
  validateEnvironmentVariables,
} from "./utils";

export { DiscordIdSchemaV4, parseDiscordIdV4, validateDiscordIdV4 } from "./utils/discord-id";
