import { z } from "zod";
import { DiscordUserIdSchema, DiscordGuildIdSchema } from "../../utils/common";

export const UpsertDiscordUserSchema = z.object({
  id: DiscordUserIdSchema,
  username: z.string().min(1).max(32),
  discriminator: z
    .string()
    .regex(/^[0-9]{4}$/)
    .nullable()
    .optional(),
  avatar_url: z.url({ error: "Invalid URL" }).nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const BlacklistUserSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  target_id: DiscordUserIdSchema,
  is_role: z.boolean().default(false),
});

export const UnblacklistSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  target_id: DiscordUserIdSchema,
  is_role: z.boolean().default(false),
});

export const CheckBlacklistSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  user_id: DiscordUserIdSchema,
  role_ids: z.array(DiscordUserIdSchema).optional(),
});

export const UserQuerySchema = z.object({
  search: z.string().max(100).optional(),
  guild_id: DiscordGuildIdSchema.optional(),
  has_open_tickets: z.boolean().optional(),
  is_blacklisted: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

export const UserStatsQuerySchema = z.object({
  user_id: DiscordUserIdSchema,
  guild_id: DiscordGuildIdSchema.optional(),
});

export type UpsertDiscordUser = z.infer<typeof UpsertDiscordUserSchema>;
export type BlacklistUser = z.infer<typeof BlacklistUserSchema>;
export type Unblacklist = z.infer<typeof UnblacklistSchema>;
export type CheckBlacklist = z.infer<typeof CheckBlacklistSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UserStatsQuery = z.infer<typeof UserStatsQuerySchema>;
