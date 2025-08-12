import { z } from "zod";
import { DiscordChannelIdSchema } from "@ticketsbot/core";

export const defaultSettings = (guildId: string) => ({
  id: guildId,
  settings: {
    transcriptsChannel: null,
    logChannel: null,
    defaultTicketMessage: null,
    ticketCategories: [],
    supportRoles: [],
    ticketNameFormat: "ticket-{number}",
    allowUserClose: true,
  },
  footer: {
    text: null,
    link: null,
  },
  colors: {
    primary: "#5865F2",
    success: "#57F287",
    error: "#ED4245",
  },
  branding: {
    name: "Support",
    logo: null,
    banner: null,
  },
  tags: [],
  metadata: {
    totalTickets: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

export const UpdateSettingsSchema = z.object({
  settings: z
    .object({
      transcriptsChannel: DiscordChannelIdSchema.nullable().optional(),
      logChannel: DiscordChannelIdSchema.nullable().optional(),
      defaultTicketMessage: z.string().max(1000).nullable().optional(),
      ticketCategories: z.array(DiscordChannelIdSchema).optional(),
      supportRoles: z.array(z.string()).optional(),
      ticketNameFormat: z.string().max(100).optional(),
      allowUserClose: z.boolean().optional(),
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
