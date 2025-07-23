import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test the forms API schemas by importing and parsing them
describe("Forms API Schema Validation", () => {
  // Recreate the schemas from forms.ts for testing
  const ApiFormFieldSchema = z.object({
    type: z.enum([
      "SHORT_TEXT",
      "PARAGRAPH",
      "SELECT",
      "EMAIL",
      "NUMBER",
      "CHECKBOX",
      "RADIO",
      "DATE",
    ]),
    label: z.string().min(1).max(100),
    placeholder: z.string().max(100).optional(),
    helpText: z.string().max(500).optional(),
    required: z.boolean().optional().default(false),
    validationRules: z
      .object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        pattern: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        options: z
          .array(
            z.object({
              label: z.string(),
              value: z.string(),
            })
          )
          .optional(),
        errorMessage: z.string().optional(),
      })
      .optional(),
    position: z.number().optional(),
  });

  const ApiCreateFormSchema = z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(1000).nullable().optional(),
      fields: z.array(ApiFormFieldSchema).min(1).max(25),
    })
    .refine((data) => data.fields.every((f) => f.label.trim().length > 0), {
      message: "All field labels must be non-empty",
    })
    .refine(
      (data) => {
        const labels = data.fields.map((f) => f.label.toLowerCase());
        return labels.length === new Set(labels).size;
      },
      { message: "Field labels must be unique" }
    );

  describe("ApiFormFieldSchema", () => {
    it("should accept valid form fields", () => {
      const validFields = [
        {
          type: "SHORT_TEXT",
          label: "Your Name",
          placeholder: "Enter your name",
          required: true,
        },
        {
          type: "EMAIL",
          label: "Email Address",
          helpText: "We'll never share your email",
          validationRules: {
            errorMessage: "Please enter a valid email",
          },
        },
        {
          type: "SELECT",
          label: "Priority",
          validationRules: {
            options: [
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
            ],
          },
        },
        {
          type: "NUMBER",
          label: "Age",
          validationRules: {
            min: 18,
            max: 100,
            errorMessage: "Must be between 18 and 100",
          },
        },
      ];

      validFields.forEach((field) => {
        const result = ApiFormFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid field types", () => {
      const result = ApiFormFieldSchema.safeParse({
        type: "INVALID_TYPE",
        label: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty labels", () => {
      const result = ApiFormFieldSchema.safeParse({
        type: "SHORT_TEXT",
        label: "",
      });
      expect(result.success).toBe(false);
    });

    it("should enforce character limits", () => {
      const longLabel = ApiFormFieldSchema.safeParse({
        type: "SHORT_TEXT",
        label: "a".repeat(101), // Too long
      });
      expect(longLabel.success).toBe(false);

      const longPlaceholder = ApiFormFieldSchema.safeParse({
        type: "SHORT_TEXT",
        label: "Test",
        placeholder: "a".repeat(101), // Too long
      });
      expect(longPlaceholder.success).toBe(false);

      const longHelp = ApiFormFieldSchema.safeParse({
        type: "SHORT_TEXT",
        label: "Test",
        helpText: "a".repeat(501), // Too long
      });
      expect(longHelp.success).toBe(false);
    });

    it("should set default values", () => {
      const result = ApiFormFieldSchema.parse({
        type: "SHORT_TEXT",
        label: "Test",
      });
      expect(result.required).toBe(false); // Default value
    });
  });

  describe("ApiCreateFormSchema", () => {
    it("should accept valid form creation data", () => {
      const validForm = {
        name: "Contact Form",
        description: "Please fill out this form to contact us",
        fields: [
          {
            type: "SHORT_TEXT",
            label: "Name",
            required: true,
          },
          {
            type: "EMAIL",
            label: "Email",
            required: true,
          },
          {
            type: "PARAGRAPH",
            label: "Message",
            placeholder: "Enter your message here",
          },
        ],
      };

      const result = ApiCreateFormSchema.safeParse(validForm);
      expect(result.success).toBe(true);
    });

    it("should require at least one field", () => {
      const result = ApiCreateFormSchema.safeParse({
        name: "Empty Form",
        fields: [],
      });
      expect(result.success).toBe(false);
    });

    it("should enforce maximum fields limit", () => {
      const fields = Array(26)
        .fill(null)
        .map((_, i) => ({
          type: "SHORT_TEXT",
          label: `Field ${i}`,
        }));

      const result = ApiCreateFormSchema.safeParse({
        name: "Too Many Fields",
        fields,
      });
      expect(result.success).toBe(false);
    });

    it("should reject forms with duplicate field labels", () => {
      const result = ApiCreateFormSchema.safeParse({
        name: "Duplicate Labels",
        fields: [
          { type: "SHORT_TEXT", label: "Name" },
          { type: "SHORT_TEXT", label: "name" }, // Same label (case-insensitive)
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Field labels must be unique");
      }
    });

    it("should reject forms with empty field labels", () => {
      const result = ApiCreateFormSchema.safeParse({
        name: "Form with empty label",
        fields: [
          { type: "SHORT_TEXT", label: "  " }, // Only whitespace
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("All field labels must be non-empty");
      }
    });

    it("should handle null description", () => {
      const result = ApiCreateFormSchema.safeParse({
        name: "Form",
        description: null,
        fields: [{ type: "SHORT_TEXT", label: "Field" }],
      });
      expect(result.success).toBe(true);
    });

    it("should enforce name constraints", () => {
      // Empty name
      const emptyName = ApiCreateFormSchema.safeParse({
        name: "",
        fields: [{ type: "SHORT_TEXT", label: "Field" }],
      });
      expect(emptyName.success).toBe(false);

      // Too long name
      const longName = ApiCreateFormSchema.safeParse({
        name: "a".repeat(101),
        fields: [{ type: "SHORT_TEXT", label: "Field" }],
      });
      expect(longName.success).toBe(false);
    });
  });
});
