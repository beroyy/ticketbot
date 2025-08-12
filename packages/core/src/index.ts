export {
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
  type DiscordId,
  type TicketStatus,
  type UserRole,
  type PanelType,
  type FormFieldType,
  type ActionType,
  type Priority,
} from "./utils/common";

export {
  PermissionFlags,
  type PermissionFlag,
  type PermissionValue,
  ALL_PERMISSIONS,
  PermissionCategories,
  DefaultRolePermissions,
} from "./permissions/constants";
export { PermissionUtils } from "./permissions/utils";

export {
  type BotConfig,
  type TicketEmbedOptions,
  formatDuration,
  parseDiscordId,
  formatDiscordId,
  createTicketThreadName,
  validateEnvironmentVariables,
} from "./utils";

export { DiscordIdSchemaV4, parseDiscordIdV4, validateDiscordIdV4 } from "./utils/discord-id";

export { logger, createLogger } from "./utils/logger";

// Context system is server-only and must be imported directly:
// import { Actor } from "@ticketsbot/core/context";
