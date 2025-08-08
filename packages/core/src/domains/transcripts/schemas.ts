import { z } from "zod";
import {
  DiscordIdSchema,
  DiscordUserIdSchema,
  JsonMetadataSchema,
  PaginationSchema,
} from "../../utils/common";

/**
 * Transcript schema
 */
export const TranscriptSchema = z.object({
  id: z.number(),
  ticketId: z.number(),
  summary: z.string().nullable(),
  sentimentScore: z.number().min(-1).max(1).nullable(),
  embedding: z.string().nullable(),
  formData: JsonMetadataSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Ticket message creation schema
 */
export const CreateTicketMessageSchema = z.object({
  ticketId: z.number().int().positive(),
  authorId: DiscordUserIdSchema,
  messageId: DiscordIdSchema,
  content: z.string().max(4000).nullable(),
  embeds: z.string().nullable(), // JSON string of embeds
  attachments: z.string().nullable(), // JSON string of attachments
  messageType: z.string().max(20).nullable(),
  referenceId: DiscordIdSchema.nullable(),
});

/**
 * Update ticket message schema
 */
export const UpdateTicketMessageSchema = z.object({
  content: z.string().max(4000).nullable().optional(),
  editedAt: z.date().optional(),
});

/**
 * Delete ticket message schema
 */
export const DeleteTicketMessageSchema = z.object({
  messageId: DiscordIdSchema,
  deletedById: DiscordUserIdSchema,
});

/**
 * Ticket message schema
 */
export const TicketMessageSchema = z.object({
  id: z.number(),
  transcriptId: z.number(),
  messageId: DiscordIdSchema,
  authorId: DiscordUserIdSchema,
  content: z.string().nullable(),
  embeds: z.string().nullable(),
  attachments: z.string().nullable(),
  messageType: z.string().nullable(),
  referenceId: DiscordIdSchema.nullable(),
  createdAt: z.date(),
  editedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
});

/**
 * Store field response schema
 */
export const StoreFieldResponseSchema = z.object({
  ticketId: z.number().int().positive(),
  fieldId: z.number().int().positive(),
  value: z.string(),
});

/**
 * Ticket feedback schema
 */
export const SubmitFeedbackSchema = z.object({
  ticketId: z.number().int().positive(),
  submittedById: DiscordUserIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/**
 * Export transcript schema
 */
export const ExportTranscriptSchema = z.object({
  ticketId: z.number().int().positive(),
  format: z.enum(["html", "pdf", "json", "txt"]),
  includeMetadata: z.boolean().default(true),
  includeAttachments: z.boolean().default(false),
});

/**
 * Message query schema
 */
export const MessageQuerySchema = z.object({
  ticketId: z.number().int().positive(),
  authorId: DiscordUserIdSchema.optional(),
  includeDeleted: z.boolean().default(false),
  pagination: PaginationSchema.optional(),
});

/**
 * Transcript with messages schema
 */
export const TranscriptWithMessagesSchema = z.object({
  transcript: TranscriptSchema,
  messages: z.array(TicketMessageSchema),
  feedback: z
    .object({
      rating: z.number(),
      comment: z.string().nullable(),
      submittedById: DiscordUserIdSchema,
      submittedAt: z.date(),
    })
    .nullable(),
});

/**
 * Type inference helpers
 */
export type Transcript = z.infer<typeof TranscriptSchema>;
export type CreateTicketMessageInput = z.infer<typeof CreateTicketMessageSchema>;
export type UpdateTicketMessageInput = z.infer<typeof UpdateTicketMessageSchema>;
export type DeleteTicketMessageInput = z.infer<typeof DeleteTicketMessageSchema>;
export type TicketMessage = z.infer<typeof TicketMessageSchema>;
export type StoreFieldResponseInput = z.infer<typeof StoreFieldResponseSchema>;
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
export type ExportTranscriptInput = z.infer<typeof ExportTranscriptSchema>;
export type MessageQuery = z.infer<typeof MessageQuerySchema>;
export type TranscriptWithMessages = z.infer<typeof TranscriptWithMessagesSchema>;
