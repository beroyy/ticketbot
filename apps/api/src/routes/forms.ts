import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { Form } from "@ticketsbot/core/domains";
import { requireAuth } from "../middleware/context";
import type { AuthSession } from "@ticketsbot/core/auth";
import { API_TO_DOMAIN_FIELD_TYPE } from "../utils/schema-transforms";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

// API-specific field schema with proper types
const ApiFormFieldSchema = z.object({
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

// API Create Form Schema - extends core with fields
const ApiCreateFormSchema = z
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

// API Update Form Schema
const ApiUpdateFormSchema = z.object({
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
    .describe("Updated form fields (currently not fully implemented)"),
});

export const forms: Hono<{ Variables: Variables }> = new Hono<{ Variables: Variables }>();

// GET /forms - Get forms for a guild
forms.get(
  "/",
  requireAuth,
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    const { guildId } = c.req.valid("query");
    c.set("guildId", guildId);

    const forms = await Form.list();
    return c.json(forms);
  }
);

// GET /forms/:id - Get a specific form
forms.get(
  "/:id",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    })
  ),
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    const { id } = c.req.valid("param");
    const { guildId } = c.req.valid("query");
    c.set("guildId", guildId);

    const form = await Form.getById(id);
    return c.json(form);
  }
);

// POST /forms - Create a new form
forms.post(
  "/",
  requireAuth,
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  zValidator("json", ApiCreateFormSchema),
  async (c) => {
    const { guildId } = c.req.valid("query");
    const input = c.req.valid("json");
    c.set("guildId", guildId);

    // Transform fields to match Form.create expectations
    const formData = {
      name: input.name,
      description: input.description === null ? undefined : input.description,
      fields: input.fields.map((field, _index) => ({
        type: API_TO_DOMAIN_FIELD_TYPE[field.type] || field.type,
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
      })),
    };

    const form = await Form.create(formData as any);
    return c.json(form, 201);
  }
);

// PUT /forms/:id - Update a form
forms.put(
  "/:id",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    })
  ),
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  zValidator("json", ApiUpdateFormSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { guildId } = c.req.valid("query");
    const input = c.req.valid("json");
    c.set("guildId", guildId);

    // Note: Form update currently only supports metadata changes
    // Field updates would require more complex logic to handle
    // adding/removing/updating individual fields

    // Update form metadata
    if (input.name || input.description !== undefined) {
      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      await Form.update(id, updateData);
    }

    // Update fields if provided
    if (input.fields) {
      // TODO: This is a simplified implementation. In production, you'd want to:
      // 1. Compare existing fields with new fields
      // 2. Update existing fields
      // 3. Create new fields
      // 4. Delete removed fields
      // For now, we'll just update the form metadata
    }

    const form = await Form.getById(id);
    return c.json(form);
  }
);

// DELETE /forms/:id - Delete a form
forms.delete(
  "/:id",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    })
  ),
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    const { id } = c.req.valid("param");
    const { guildId } = c.req.valid("query");
    c.set("guildId", guildId);

    const result = await Form.remove(id);
    return c.json(result);
  }
);

// Schema for duplicate form with template literal validation
const DuplicateFormSchema = z.object({
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

// POST /forms/:id/duplicate - Duplicate a form
forms.post(
  "/:id/duplicate",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    })
  ),
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  zValidator("json", DuplicateFormSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { guildId } = c.req.valid("query");
    const { name } = c.req.valid("json");
    c.set("guildId", guildId);

    const form = await Form.duplicate(id, name);
    return c.json(form, 201);
  }
);
