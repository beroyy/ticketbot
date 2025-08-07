import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Form } from "@ticketsbot/core/domains";
import type { DomainFormFieldType } from "@ticketsbot/core";
import { createRoute } from "../factory";
import { ApiErrors } from "../utils/error-handler";
import { compositions } from "../middleware/context";

const API_TO_DOMAIN_FIELD_TYPE: Record<string, DomainFormFieldType> = {
  SHORT_TEXT: "TEXT",
  PARAGRAPH: "TEXT_AREA",
  SELECT: "SELECT",
  EMAIL: "EMAIL",
  NUMBER: "NUMBER",
  CHECKBOX: "CHECKBOX",
  RADIO: "RADIO",
  DATE: "DATE",
};

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

const CreateFormSchema = z
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

const UpdateFormSchema = z.object({
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

const transformFieldsToDomain = (fields: z.infer<typeof ApiFormFieldSchema>[]) => {
  return fields.map((field) => ({
    type: API_TO_DOMAIN_FIELD_TYPE[field.type] || (field.type as DomainFormFieldType),
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

export const formRoutes = createRoute()
  .get("/", ...compositions.guildScoped, async (c) => {
    const forms = await Form.list();
    return c.json(forms);
  })

  .get(
    "/:id",
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        const form = await Form.getById(id);
        return c.json(form);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Form");
        }
        throw error;
      }
    }
  )

  .post("/", ...compositions.guildScoped, zValidator("json", CreateFormSchema), async (c) => {
    const input = c.req.valid("json");

    const formData = {
      name: input.name,
      description: input.description === null ? undefined : input.description,
      fields: transformFieldsToDomain(input.fields),
    };

    try {
      const form = await Form.create(formData as any);
      return c.json(form, 201);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "validation_error") {
          throw ApiErrors.badRequest(String((error as any).message || "Validation error"));
        }
        if (error.code === "permission_denied") {
          throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
        }
      }
      throw error;
    }
  })

  .put(
    "/:id",
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    zValidator("json", UpdateFormSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        await Form.getById(id);

        if (input.name || input.description !== undefined) {
          const updateData: any = {};
          if (input.name) updateData.name = input.name;
          if (input.description !== undefined) updateData.description = input.description;
          await Form.update(id, updateData);
        }

        // TODO: Field updates require more complex logic
        if (input.fields) {
          // Would need to compare existing fields, update/add/remove as needed
        }

        const form = await Form.getById(id);
        return c.json(form);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Form");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
          }
        }
        throw error;
      }
    }
  )

  .delete(
    "/:id",
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        const result = await Form.remove(id);
        return c.json(result);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Form");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
          }
        }
        throw error;
      }
    }
  )

  .post(
    "/:id/duplicate",
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    zValidator("json", DuplicateFormSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name } = c.req.valid("json");

      try {
        const form = await Form.duplicate(id, name);
        return c.json(form, 201);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Form");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
          }
          if (error.code === "conflict") {
            throw ApiErrors.conflict(String((error as any).message || "Form name already exists"));
          }
        }
        throw error;
      }
    }
  );
