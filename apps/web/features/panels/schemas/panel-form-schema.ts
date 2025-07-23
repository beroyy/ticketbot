import { z } from "zod";
import { CreatePanelSchema } from "@ticketsbot/core/domains/panel/client";

// Additional UI-specific schemas
const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["short_answer", "paragraph"]),
  label: z.string().min(1, "Question label is required"),
  placeholder: z.string().optional(),
  enabled: z.boolean(),
  characterLimit: z.number().optional(),
});

const accessControlSchema = z.object({
  allowEveryone: z.boolean(),
  roles: z.array(z.string()),
});

// Individual step schemas using partial core schema
export const panelPropertiesSchema = CreatePanelSchema.pick({
  channelId: true,
  title: true,
  emoji: true,
  buttonText: true,
  color: true,
}).extend({
  buttonColor: CreatePanelSchema.shape.color, // Alias for UI
  teamId: z.string().optional(),
});

export const panelContentSchema = z.object({
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  textSections: CreatePanelSchema.shape.textSections,
  largeImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  smallImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const panelWelcomeSchema = CreatePanelSchema.pick({
  welcomeMessage: true,
  introTitle: true,
  introDescription: true,
}).extend({
  welcomeMessage: z
    .object({
      title: z.string().optional(),
      content: z.string().optional(),
      fields: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
});

export const panelAccessSchema = CreatePanelSchema.pick({
  mentionRoles: true,
  hideMentions: true,
}).extend({
  accessControl: accessControlSchema,
  mentionOnOpen: z.string().optional(),
});

// Text section schema for UI
const textSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
});

// Complete panel form schema
export const panelFormSchema = CreatePanelSchema.extend({
  // Additional UI-specific fields
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  accessControl: accessControlSchema,
  largeImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  smallImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  
  // UI aliases for better DX
  buttonColor: CreatePanelSchema.shape.color,
  teamId: z.string().optional(),
  mentionOnOpen: z.string().optional(),
  
  // Additional fields not in core
  ticketCategory: z.string().optional(),
  namingScheme: z.boolean().optional(),
  exitSurveyForm: z.string().optional(),
  awaitingResponseCategory: z.string().optional(),
  
  // Welcome message with structured format
  welcomeMessage: z
    .object({
      title: z.string().optional(),
      content: z.string().optional(),
      fields: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
    
  // Override textSections with proper array type
  textSections: z.array(textSectionSchema).default([]),
});

export type PanelFormData = z.infer<typeof panelFormSchema>;
export type PanelPropertiesData = z.infer<typeof panelPropertiesSchema>;
export type PanelContentData = z.infer<typeof panelContentSchema>;
export type PanelWelcomeData = z.infer<typeof panelWelcomeSchema>;
export type PanelAccessData = z.infer<typeof panelAccessSchema>;