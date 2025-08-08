import { z } from "zod";

// Map API field types to domain field types
export const API_TO_DOMAIN_FIELD_TYPE: Record<string, string> = {
  SHORT_TEXT: "short_text",
  PARAGRAPH: "paragraph",
  SELECT: "select",
  EMAIL: "email",
  NUMBER: "number",
  CHECKBOX: "checkbox",
  RADIO: "radio",
  DATE: "date",
};

export const ApiFormFieldSchema = z.object({
  type: z
    .enum(["SHORT_TEXT", "PARAGRAPH", "SELECT", "EMAIL", "NUMBER", "CHECKBOX", "RADIO", "DATE"])
    .describe("Field type in API format"),
  label: z.string().min(1).max(100).describe("Field label"),
  placeholder: z.string().max(100).optional().describe("Placeholder text"),
  helpText: z.string().max(500).optional().describe("Help text shown below field"),
  required: z.boolean().optional().default(false).describe("Whether field is required"),
  validationRules: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional().describe("Regex pattern for validation"),
      min: z.number().optional().describe("Minimum value for number fields"),
      max: z.number().optional().describe("Maximum value for number fields"),
      options: z
        .array(
          z.object({
            label: z.string(),
            value: z.string(),
          })
        )
        .optional()
        .describe("Options for select/radio fields"),
      errorMessage: z.string().optional().describe("Custom error message"),
    })
    .optional()
    .describe("Validation rules for the field"),
  position: z.number().optional().describe("Field position in form"),
});

export const CreateFormSchema = z
  .object({
    name: z.string().min(1).max(100).describe("Form name"),
    description: z.string().max(1000).nullable().optional().describe("Form description"),
    fields: z.array(ApiFormFieldSchema).min(1).max(25).describe("Form fields"),
  })
  .refine((data) => data.fields.every((f) => f.label.trim().length > 0), {
    message: "All field labels must be non-empty",
  })
  .refine(
    (data) => {
      // Ensure unique field labels
      const labels = data.fields.map((f) => f.label.toLowerCase());
      return labels.length === new Set(labels).size;
    },
    { message: "Field labels must be unique" }
  );

export const UpdateFormSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  fields: z
    .array(
      ApiFormFieldSchema.extend({
        id: z.number().optional().describe("Field ID for existing fields"),
      })
    )
    .min(1)
    .max(25)
    .optional()
    .describe("Updated form fields"),
});

export const DuplicateFormSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("New name for the duplicated form")
    .refine(
      (name) => !name.toLowerCase().includes("copy of copy"),
      "Please choose a more descriptive name"
    ),
});

export const transformFieldsToDomain = (fields: z.infer<typeof ApiFormFieldSchema>[]) => {
  return fields.map((field) => ({
    type: API_TO_DOMAIN_FIELD_TYPE[field.type] || field.type.toLowerCase(),
    label: field.label,
    placeholder: field.placeholder,
    required: field.required ?? false,
    validationRules: field.validationRules
      ? {
          minLength: field.validationRules.minLength,
          maxLength: field.validationRules.maxLength,
          pattern: field.validationRules.pattern,
          min: field.validationRules.min,
          max: field.validationRules.max,
          errorMessage: field.validationRules.errorMessage,
        }
      : undefined,
    options: field.validationRules?.options?.map((opt) => opt.value),
  }));
};
