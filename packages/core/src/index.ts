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
} from "./schemas/common";

export {
  CreatePanelSchema,
  UpdatePanelSchema,
  PanelQuerySchema,
  PanelTypeSchema as DomainPanelTypeSchema,
  type CreatePanelInput,
  type UpdatePanelInput,
  type PanelQuery,
  type PanelType as DomainPanelType,
} from "./domains/panel/schemas";

export {
  CreateFormSchema,
  UpdateFormSchema,
  CreateFormFieldSchema,
  UpdateFormFieldSchema,
  CreateFormSubmissionSchema,
  FormFieldTypeSchema as DomainFormFieldTypeSchema,
  FormFieldValidationSchema,
  FormWithFieldsSchema,
  validateFormFieldValue,
  type CreateFormInput,
  type UpdateFormInput,
  type CreateFormFieldInput,
  type UpdateFormFieldInput,
  type CreateFormSubmissionInput,
  type FormFieldType as DomainFormFieldType,
  type FormFieldValidation,
  type FormWithFields,
} from "./domains/form/schemas";

export {
  TicketCoreSchema,
  UpdateTicketSchema,
  TicketQuerySchema,
  FindByChannelSchema,
  type TicketCore,
  type UpdateTicketInput,
  type TicketQuery as DomainTicketQuery,
  type FindByChannelInput,
} from "./domains/ticket/schemas";

export {
  CreateTicketSchema,
  ClaimTicketSchema,
  UnclaimTicketSchema,
  CloseTicketSchema,
  ReopenTicketSchema,
  TicketStateTransitionSchema,
  LifecycleEventSchema,
  LifecycleHistoryQuerySchema,
  type CreateTicketInput,
  type ClaimTicketInput,
  type UnclaimTicketInput,
  type CloseTicketInput,
  type ReopenTicketInput,
  type TicketStateTransition,
  type LifecycleEvent,
  type LifecycleHistoryQuery,
} from "./domains/ticket-lifecycle/schemas";

export {
  TranscriptSchema,
  CreateTicketMessageSchema,
  UpdateTicketMessageSchema,
  DeleteTicketMessageSchema,
  TicketMessageSchema,
  StoreFieldResponseSchema,
  SubmitFeedbackSchema,
  ExportTranscriptSchema,
  MessageQuerySchema,
  TranscriptWithMessagesSchema,
  type Transcript,
  type CreateTicketMessageInput,
  type UpdateTicketMessageInput,
  type DeleteTicketMessageInput,
  type TicketMessage,
  type StoreFieldResponseInput,
  type SubmitFeedbackInput,
  type ExportTranscriptInput,
  type MessageQuery,
  type TranscriptWithMessages,
} from "./domains/transcripts/schemas";

export {
  AnalyticsSnapshotSchema,
  TicketStatsQuerySchema,
  CrossEntityStatsQuerySchema,
  StaffPerformanceQuerySchema,
  PanelPerformanceSchema,
  TicketTrendsSchema,
  RealtimeStatsSchema,
  GenerateReportSchema,
  type AnalyticsSnapshot,
  type TicketStatsQuery,
  type CrossEntityStatsQuery,
  type StaffPerformanceQuery,
  type PanelPerformance,
  type TicketTrends,
  type RealtimeStats,
  type GenerateReportInput,
} from "./domains/analytics/schemas";

export {
  RoleStatusSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignRoleSchema,
  RemoveRoleSchema,
  SetAdditionalPermissionsSchema,
  PermissionCheckSchema,
  BatchPermissionCheckSchema,
  RoleQuerySchema,
  RoleMemberQuerySchema,
  RoleWithMembersSchema,
  UserPermissionsResponseSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
  type AssignRoleInput,
  type RemoveRoleInput,
  type SetAdditionalPermissionsInput,
  type PermissionCheckInput,
  type BatchPermissionCheckInput,
  type RoleQuery,
  type RoleMemberQuery,
  type RoleWithMembers,
  type UserPermissionsResponse,
} from "./domains/role/schemas";

export {
  CreateTagSchema,
  UpdateTagSchema,
  TagQuerySchema,
  TrackTagUsageSchema,
  type CreateTag,
  type UpdateTag,
  type TagQuery,
  type TrackTagUsage,
} from "./domains/tag/schemas";

export {
  CreateGuildSchema,
  UpdateGuildSchema,
  UpdateGuildSettingsSchema,
  GuildQuerySchema,
  type CreateGuildInput,
  type UpdateGuildInput,
  type UpdateGuildSettingsInput,
  type GuildQuery,
} from "./domains/guild/schemas";

// Note: Keep backward compatibility with common schemas that are still in use
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
  createTicketChannelName,
  createTicketThreadName,
  validateEnvironmentVariables,
} from "./utils";

export { DiscordIdSchemaV4, parseDiscordIdV4, validateDiscordIdV4 } from "./utils/discord-id";

export { prisma } from "./prisma/client";

export {
  type ValidationResult,
  type ValidationError,
  ValidationService,
  validated,
  ZodError,
  type ZodSchema,
} from "./prisma/services/validation";

export { Redis, type RedisHealthCheck } from "./redis";
export { isRedisAvailable, getRedisConnection } from "./redis";

export { logger, createLogger } from "./utils/logger";

export { User } from "./domains/user";
export { Guild } from "./domains/guild";
export { Ticket } from "./domains/ticket";
export { Role } from "./domains/role";
export { Event } from "./domains/event";
export { Panel } from "./domains/panel";
export { Tag } from "./domains/tag";
export { Form } from "./domains/form";

// Discord integration is server-only and must be imported directly:
// import { Discord } from "@ticketsbot/core/discord";

// Context system is server-only and must be imported directly:
// import { Actor, withTransaction } from "@ticketsbot/core/context";
