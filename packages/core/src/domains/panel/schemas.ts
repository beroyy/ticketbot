import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  HexColorSchema,
  JsonMetadataSchema,
} from "../../schemas/common";

/**
 * Panel type enum
 */
export const PanelTypeSchema = z.enum(["SINGLE", "MULTI"]);

/**
 * Panel creation schema
 */
export const CreatePanelSchema = z.object({
  type: PanelTypeSchema,
  title: z.string().min(1, "Title is required").max(100, "Title cannot exceed 100 characters"),
  content: z.string().max(2000, "Content cannot exceed 2000 characters").nullable().optional(),
  guildId: DiscordGuildIdSchema,
  channelId: DiscordChannelIdSchema,
  categoryId: DiscordChannelIdSchema.nullable().optional(),
  formId: z.number().int().nullable().optional(),
  emoji: z.string().max(64, "Emoji too long").nullable().optional(),
  buttonText: z.string().min(1, "Button text is required").max(80, "Button text cannot exceed 80 characters"),
  color: HexColorSchema.nullable().optional(),
  welcomeMessage: z.string().max(2000, "Welcome message cannot exceed 2000 characters").nullable().optional(),
  introTitle: z.string().max(256, "Intro title cannot exceed 256 characters").nullable().optional(),
  introDescription: z.string().max(2000, "Intro description cannot exceed 2000 characters").nullable().optional(),
  channelPrefix: z.string().max(20, "Channel prefix cannot exceed 20 characters").nullable().optional(),
  mentionRoles: JsonMetadataSchema.optional(),
  hideMentions: z.boolean().default(false),
  parentPanelId: z.number().int().nullable().optional(),
  orderIndex: z.number().int().default(0),
  enabled: z.boolean().default(true),
  permissions: JsonMetadataSchema.optional(),
  imageUrl: z.url({ error: "Invalid image URL" }).nullable().optional(),
  thumbnailUrl: z.url({ error: "Invalid thumbnail URL" }).nullable().optional(),
  textSections: JsonMetadataSchema.optional(),
});

/**
 * Panel update schema - all fields optional except ID
 */
export const UpdatePanelSchema = CreatePanelSchema.partial().extend({
  id: z.number().int(),
});

/**
 * Panel query schema
 */
export const PanelQuerySchema = z.object({
  guildId: DiscordGuildIdSchema.optional(),
  channelId: DiscordChannelIdSchema.optional(),
  type: PanelTypeSchema.optional(),
  enabled: z.boolean().optional(),
  parentPanelId: z.number().int().nullable().optional(),
});

/**
 * Type inference helpers
 */
export type PanelType = z.infer<typeof PanelTypeSchema>;
export type CreatePanelInput = z.infer<typeof CreatePanelSchema>;
export type UpdatePanelInput = z.infer<typeof UpdatePanelSchema>;
export type PanelQuery = z.infer<typeof PanelQuerySchema>;
