import { z } from "zod";
import { DiscordChannelIdSchema } from "../../schemas/common";

/**
 * Modern settings update schema that matches the domain structure
 */
export const UpdateSettingsSchema = z.object({
  settings: z
    .object({
      transcriptsChannel: DiscordChannelIdSchema.nullable().optional(),
      logChannel: DiscordChannelIdSchema.nullable().optional(),
      defaultTicketMessage: z.string().max(1000).nullable().optional(),
      ticketCategories: z.array(DiscordChannelIdSchema).optional(),
      autoCloseTime: z.number().int().min(0).max(720).nullable().optional(), // hours
      supportRoles: z.array(z.string()).optional(),
      ticketNameFormat: z.string().max(100).optional(),
      allowUserClose: z.boolean().optional(),
      threadTickets: z.boolean().optional(),
      autoThreadArchive: z.boolean().optional(),
    })
    .optional(),
  footer: z
    .object({
      text: z.string().max(200).nullable().optional(),
      link: z.url({ error: "Invalid URL" }).nullable().optional(),
    })
    .optional(),
  colors: z
    .object({
      primary: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .optional(),
      success: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .optional(),
      error: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i)
        .optional(),
    })
    .optional(),
  branding: z
    .object({
      name: z.string().max(100).optional(),
      logo: z.url({ error: "Invalid URL" }).nullable().optional(),
      banner: z.url({ error: "Invalid URL" }).nullable().optional(),
    })
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
