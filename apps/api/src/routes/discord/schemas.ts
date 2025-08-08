import { z } from "zod";

export const GuildResponse = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.string(),
  features: z.array(z.string()),
  botInstalled: z.boolean().optional(),
  botConfigured: z.boolean().optional(),
});

export const GuildsListResponse = z.object({
  guilds: z.array(GuildResponse),
  connected: z.boolean(),
  error: z.string().nullable(),
  code: z.string().nullable(),
});

export const GuildDetailResponse = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  description: z.string().optional(),
  features: z.array(z.string()),
  botInstalled: z.boolean(),
  botConfigured: z.boolean(),
});

export const ChannelResponse = z.object({
  id: z.string().nullable(),
  name: z.string(),
  type: z.number().nullable(),
  parentId: z.string().nullable(),
});

export const GuildSyncResponse = z.object({
  success: z.boolean(),
  syncedCount: z.number(),
  totalAdminGuilds: z.number(),
  errors: z.array(z.string()).optional(),
});
