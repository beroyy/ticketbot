import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordUserIdSchema,
  HexColorSchema,
  BigIntStringSchema,
  JsonMetadataSchema,
} from "../../schemas/common";

/**
 * Team role status
 */
export const TeamRoleStatusSchema = z.enum(["active", "inactive"]);

/**
 * Team role creation schema
 */
export const CreateTeamRoleSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  name: z.string().min(1).max(50),
  color: HexColorSchema.default("#5865F2"),
  position: z.number().int().min(0).default(0),
  permissions: BigIntStringSchema.default("0"),
  is_default: z.boolean().default(false),
  status: TeamRoleStatusSchema.default("active"),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Team role update schema
 */
export const UpdateTeamRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: HexColorSchema.optional(),
  position: z.number().int().min(0).optional(),
  permissions: BigIntStringSchema.optional(),
  is_default: z.boolean().optional(),
  status: TeamRoleStatusSchema.optional(),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Assign role to member schema
 */
export const AssignRoleSchema = z.object({
  team_role_id: z.number().int().positive(),
  discord_id: DiscordUserIdSchema,
  assigned_by_id: DiscordUserIdSchema.optional(),
});

/**
 * Remove role from member schema
 */
export const RemoveRoleSchema = z.object({
  team_role_id: z.number().int().positive(),
  discord_id: DiscordUserIdSchema,
});

/**
 * Set additional permissions schema
 */
export const SetAdditionalPermissionsSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  discord_id: DiscordUserIdSchema,
  additional_permissions: BigIntStringSchema,
});

/**
 * Permission check schema
 */
export const PermissionCheckSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  discord_id: DiscordUserIdSchema,
  permission: BigIntStringSchema,
});

/**
 * Batch permission check schema
 */
export const BatchPermissionCheckSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  discord_id: DiscordUserIdSchema,
  permissions: z.array(BigIntStringSchema),
  requireAll: z.boolean().default(false), // true = hasAllPermissions, false = hasAnyPermission
});

/**
 * Team role query schema
 */
export const TeamRoleQuerySchema = z.object({
  guild_id: DiscordGuildIdSchema.optional(),
  status: TeamRoleStatusSchema.optional(),
  is_default: z.boolean().optional(),
});

/**
 * Team member query schema
 */
export const TeamMemberQuerySchema = z.object({
  guild_id: DiscordGuildIdSchema,
  role_id: z.number().int().positive().optional(),
  discord_id: DiscordUserIdSchema.optional(),
});

/**
 * Team role with members schema
 */
export const TeamRoleWithMembersSchema = z.object({
  id: z.number(),
  guild_id: DiscordGuildIdSchema,
  name: z.string(),
  color: HexColorSchema,
  position: z.number(),
  permissions: z.bigint(),
  is_default: z.boolean(),
  status: TeamRoleStatusSchema,
  metadata: JsonMetadataSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  members: z
    .array(
      z.object({
        id: z.number(),
        team_role_id: z.number(),
        discord_id: DiscordUserIdSchema,
        assigned_by_id: DiscordUserIdSchema.nullable(),
        assigned_at: z.date(),
      })
    )
    .optional(),
});

/**
 * User permissions response schema
 */
export const UserPermissionsResponseSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  discord_id: DiscordUserIdSchema,
  roles: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      color: HexColorSchema,
      permissions: z.string(), // BigInt as string for JSON serialization
    })
  ),
  additionalPermissions: z.string().nullable(), // BigInt as string
  totalPermissions: z.string(), // BigInt as string
  permissionNames: z.array(z.string()),
});

/**
 * Type inference helpers
 */
export type CreateTeamRoleInput = z.infer<typeof CreateTeamRoleSchema>;
export type UpdateTeamRoleInput = z.infer<typeof UpdateTeamRoleSchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;
export type RemoveRoleInput = z.infer<typeof RemoveRoleSchema>;
export type SetAdditionalPermissionsInput = z.infer<typeof SetAdditionalPermissionsSchema>;
export type PermissionCheckInput = z.infer<typeof PermissionCheckSchema>;
export type BatchPermissionCheckInput = z.infer<typeof BatchPermissionCheckSchema>;
export type TeamRoleQuery = z.infer<typeof TeamRoleQuerySchema>;
export type TeamMemberQuery = z.infer<typeof TeamMemberQuerySchema>;
export type TeamRoleWithMembers = z.infer<typeof TeamRoleWithMembersSchema>;
export type UserPermissionsResponse = z.infer<typeof UserPermissionsResponseSchema>;
