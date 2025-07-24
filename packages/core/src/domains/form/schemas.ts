import { z } from "zod";
import {
  DiscordGuildIdSchema,
  DiscordUserIdSchema,
  JsonMetadataSchema,
} from "../../schemas/common";

/**
 * Form field type enum
 */
export const FormFieldTypeSchema = z.enum([
  "TEXT",
  "TEXT_AREA",
  "NUMBER",
  "EMAIL",
  "URL",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "RADIO",
  "DATE",
  "TIME",
  "DATETIME",
]);

/**
 * Form field validation rules schema
 */
export const FormFieldValidationSchema = z.object({
  required: z.boolean().default(false),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  pattern: z.string().optional(), // Regex pattern
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(), // For SELECT, MULTI_SELECT, RADIO
  errorMessage: z.string().optional(),
});

/**
 * Form creation schema
 */
export const CreateFormSchema = z.object({
  guild_id: DiscordGuildIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().default(true),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Form update schema
 */
export const UpdateFormSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Form field creation schema
 */
export const CreateFormFieldSchema = z.object({
  form_id: z.number().int().positive(),
  label: z.string().min(1).max(100),
  placeholder: z.string().max(100).nullable().optional(),
  help_text: z.string().max(500).nullable().optional(),
  field_type: FormFieldTypeSchema,
  validation_rules: FormFieldValidationSchema.default({ required: false }),
  position: z.number().int().min(0).default(0),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Form field update schema
 */
export const UpdateFormFieldSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  placeholder: z.string().max(100).nullable().optional(),
  help_text: z.string().max(500).nullable().optional(),
  field_type: FormFieldTypeSchema.optional(),
  validation_rules: FormFieldValidationSchema.optional(),
  position: z.number().int().min(0).optional(),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Form submission schema
 */
export const CreateFormSubmissionSchema = z.object({
  form_id: z.number().int().positive(),
  panel_id: z.number().int().positive().nullable().optional(),
  ticket_id: z.number().int().positive().nullable().optional(),
  submitted_by_id: DiscordUserIdSchema,
  form_data: z.record(z.string(), z.unknown()),
  metadata: JsonMetadataSchema.optional(),
});

/**
 * Form field value validation based on field type
 */
export const validateFormFieldValue = (
  fieldType: z.infer<typeof FormFieldTypeSchema>,
  value: unknown,
  validation: z.infer<typeof FormFieldValidationSchema>
) => {
  // Base required check
  if (validation.required && (value === null || value === undefined || value === "")) {
    throw new Error(validation.errorMessage || "This field is required");
  }

  // Skip validation if value is empty and not required
  if (!validation.required && (value === null || value === undefined || value === "")) {
    return true;
  }

  switch (fieldType) {
    case "TEXT":
    case "TEXT_AREA":
    case "EMAIL":
    case "URL": {
      const stringValue = String(value);
      if (validation.minLength && stringValue.length < validation.minLength) {
        throw new Error(
          validation.errorMessage || `Minimum length is ${validation.minLength.toString()}`
        );
      }
      if (validation.maxLength && stringValue.length > validation.maxLength) {
        throw new Error(
          validation.errorMessage || `Maximum length is ${validation.maxLength.toString()}`
        );
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(stringValue)) {
        throw new Error(validation.errorMessage || "Invalid format");
      }
      if (fieldType === "EMAIL" && !z.email({ error: "Invalid email address" }).safeParse(stringValue).success) {
        throw new Error(validation.errorMessage || "Invalid email address");
      }
      if (fieldType === "URL" && !z.url({ error: "Invalid URL" }).safeParse(stringValue).success) {
        throw new Error(validation.errorMessage || "Invalid URL");
      }
      break;
    }
    case "NUMBER": {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        throw new Error(validation.errorMessage || "Must be a number");
      }
      if (validation.min !== undefined && numValue < validation.min) {
        throw new Error(validation.errorMessage || `Minimum value is ${validation.min.toString()}`);
      }
      if (validation.max !== undefined && numValue > validation.max) {
        throw new Error(validation.errorMessage || `Maximum value is ${validation.max.toString()}`);
      }
      break;
    }
    case "SELECT":
    case "RADIO": {
      if (validation.options && !validation.options.some((opt) => opt.value === value)) {
        throw new Error(validation.errorMessage || "Invalid selection");
      }
      break;
    }
    case "MULTI_SELECT": {
      if (!Array.isArray(value)) {
        throw new Error(validation.errorMessage || "Must be an array");
      }
      if (validation.options) {
        const validValues = validation.options.map((opt) => opt.value);
        for (const v of value as unknown[]) {
          if (!validValues.includes(String(v))) {
            throw new Error(validation.errorMessage || "Invalid selection");
          }
        }
      }
      break;
    }
    case "CHECKBOX": {
      if (typeof value !== "boolean") {
        throw new Error(validation.errorMessage || "Must be a boolean");
      }
      break;
    }
    case "DATE":
    case "TIME":
    case "DATETIME": {
      if (!z.iso.datetime({ error: "Invalid date/time format" }).safeParse(value).success) {
        throw new Error(validation.errorMessage || "Invalid date/time format");
      }
      break;
    }
  }

  return true;
};

/**
 * Form with fields schema
 */
export const FormWithFieldsSchema = z.object({
  id: z.number(),
  guild_id: DiscordGuildIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  metadata: JsonMetadataSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  fields: z
    .array(
      z.object({
        id: z.number(),
        form_id: z.number(),
        label: z.string(),
        placeholder: z.string().nullable(),
        help_text: z.string().nullable(),
        field_type: FormFieldTypeSchema,
        validation_rules: FormFieldValidationSchema,
        position: z.number(),
        metadata: JsonMetadataSchema.nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
      })
    )
    .optional(),
});

/**
 * Type inference helpers
 */
export type CreateFormInput = z.infer<typeof CreateFormSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;
export type CreateFormFieldInput = z.infer<typeof CreateFormFieldSchema>;
export type UpdateFormFieldInput = z.infer<typeof UpdateFormFieldSchema>;
export type CreateFormSubmissionInput = z.infer<typeof CreateFormSubmissionSchema>;
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;
export type FormFieldValidation = z.infer<typeof FormFieldValidationSchema>;
export type FormWithFields = z.infer<typeof FormWithFieldsSchema>;
