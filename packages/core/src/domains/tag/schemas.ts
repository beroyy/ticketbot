import { z } from "zod";
import { DiscordGuildIdSchema, DiscordUserIdSchema } from "../../schemas/common";

/**
 * Create tag schema
 */
export const CreateTagSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  tag_id: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message: "Tag ID must contain only letters, numbers, underscores, and hyphens",
    }),
  content: z.string().min(1).max(2000), // Discord message limit
  created_by_id: DiscordUserIdSchema.optional(),
});

/**
 * Update tag schema
 */
export const UpdateTagSchema = z.object({
  content: z.string().min(1).max(2000),
  updated_by_id: DiscordUserIdSchema.optional(),
});

/**
 * Tag query schema
 */
export const TagQuerySchema = z.object({
  guild_id: DiscordGuildIdSchema,
  search: z.string().max(100).optional(), // Search in tag_id or content
  created_by_id: DiscordUserIdSchema.optional(),
  limit: z.number().int().positive().max(100).default(50),
});

/**
 * Tag usage tracking schema
 */
export const TrackTagUsageSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  tag_id: z.string(),
  used_by_id: DiscordUserIdSchema,
  channel_id: DiscordGuildIdSchema.optional(),
  ticket_id: z.number().int().positive().optional(),
});

/**
 * Type exports
 */
export type CreateTag = z.infer<typeof CreateTagSchema>;
export type UpdateTag = z.infer<typeof UpdateTagSchema>;
export type TagQuery = z.infer<typeof TagQuerySchema>;
export type TrackTagUsage = z.infer<typeof TrackTagUsageSchema>;
