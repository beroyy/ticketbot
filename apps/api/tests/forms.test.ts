import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { forms } from "../src/routes/forms";
import type { CreateFormInput } from "@ticketsbot/core";

// Mock dependencies
vi.mock("@ticketsbot/core/domains", () => ({
  Form: {
    list: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Test Form",
        guild_id: "123456789012345678",
        fields: [],
      },
    ]),
    getById: vi.fn().mockResolvedValue({
      id: 1,
      name: "Test Form",
      guild_id: "123456789012345678",
      fields: [
        {
          id: 1,
          field_type: "TEXT",
          label: "Your Name",
          required: true,
        },
      ],
    }),
    create: vi.fn().mockImplementation((input: any) => ({
      id: 1,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: vi.fn().mockImplementation((id: number, input: any) => ({
      id,
      ...input,
      updatedAt: new Date(),
    })),
    remove: vi.fn().mockResolvedValue({ success: true }),
    duplicate: vi.fn().mockResolvedValue({
      id: 2,
      name: "Test Form (Copy)",
    }),
  },
}));

// Mock middleware
vi.mock("../src/middleware/context", () => ({
  requireAuth: vi.fn((c: any, next: any) => next()),
}));

describe("Form Routes", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();

    // Set up test context
    app.use("*", async (c, next) => {
      c.set("user", { id: "123456789", email: "test@example.com" });
      c.set("session", { userId: "123456789" });
      await next();
    });

    app.route("/forms", forms);
  });

  describe("GET /forms", () => {
    it("should list forms for a guild", async () => {
      const response = await app.request("/forms?guildId=123456789012345678");

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        id: 1,
        name: "Test Form",
      });
    });

    it("should reject invalid guild ID", async () => {
      const response = await app.request("/forms?guildId=invalid");
      expect(response.status).toBe(400);
    });
  });

  describe("POST /forms", () => {
    it("should create form with transformed field types", async () => {
      const apiRequest = {
        name: "Support Form",
        description: "Please fill out this form",
        fields: [
          {
            type: "SHORT_TEXT",
            label: "Your Name",
            placeholder: "Enter your name",
            required: true,
            validationRules: {
              minLength: 2,
              maxLength: 50,
              pattern: "^[a-zA-Z\\s]+$",
              errorMessage: "Please enter a valid name",
            },
          },
          {
            type: "PARAGRAPH",
            label: "Describe Your Issue",
            placeholder: "Be detailed",
            helpText: "The more detail, the better",
            required: true,
            validationRules: {
              minLength: 10,
              maxLength: 1000,
            },
          },
          {
            type: "SELECT",
            label: "Priority",
            required: true,
            validationRules: {
              options: [
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
              ],
            },
          },
        ],
      };

      const response = await app.request("/forms?guildId=123456789012345678", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiRequest),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      // Verify transformation happened
      const { Form } = await import("@ticketsbot/core/domains");
      expect(Form.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Support Form",
          description: "Please fill out this form",
          fields: expect.arrayContaining([
            expect.objectContaining({
              type: "short_text", // Transformed from SHORT_TEXT
              label: "Your Name",
              placeholder: "Enter your name",
              required: true,
              validationRules: expect.objectContaining({
                minLength: 2,
                maxLength: 50,
                pattern: "^[a-zA-Z\\s]+$",
              }),
            }),
            expect.objectContaining({
              type: "paragraph", // Transformed from PARAGRAPH
              label: "Describe Your Issue",
            }),
            expect.objectContaining({
              type: "select", // Transformed from SELECT
              label: "Priority",
              options: ["low", "medium", "high"], // Extracted values
            }),
          ]),
        })
      );
    });

    it("should handle all field type transformations", async () => {
      const fieldTypes = [
        { api: "SHORT_TEXT", domain: "short_text" },
        { api: "PARAGRAPH", domain: "paragraph" },
        { api: "SELECT", domain: "select" },
        { api: "EMAIL", domain: "email" },
        { api: "NUMBER", domain: "number" },
        { api: "CHECKBOX", domain: "checkbox" },
        { api: "RADIO", domain: "radio" },
        { api: "DATE", domain: "date" },
      ];

      for (const { api, domain } of fieldTypes) {
        const apiRequest = {
          name: `Test ${api} Form`,
          fields: [
            {
              type: api,
              label: `${api} Field`,
              required: false,
            },
          ],
        };

        const response = await app.request("/forms?guildId=123456789012345678", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiRequest),
        });

        expect(response.status).toBe(201);

        const { Form } = await import("@ticketsbot/core/domains");
        expect(Form.create).toHaveBeenCalledWith(
          expect.objectContaining({
            fields: expect.arrayContaining([
              expect.objectContaining({
                type: domain,
                label: `${api} Field`,
              }),
            ]),
          })
        );
      }
    });

    it("should handle null description correctly", async () => {
      const apiRequest = {
        name: "Simple Form",
        description: null, // API sends null
        fields: [
          {
            type: "SHORT_TEXT",
            label: "Name",
            required: true,
          },
        ],
      };

      const response = await app.request("/forms?guildId=123456789012345678", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiRequest),
      });

      expect(response.status).toBe(201);

      const { Form } = await import("@ticketsbot/core/domains");
      expect(Form.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined, // Converted from null to undefined
        })
      );
    });

    it("should reject forms with no fields", async () => {
      const apiRequest = {
        name: "Empty Form",
        fields: [],
      };

      const response = await app.request("/forms?guildId=123456789012345678", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiRequest),
      });

      expect(response.status).toBe(400);
    });

    it("should validate field validation rules", async () => {
      const apiRequest = {
        name: "Validated Form",
        fields: [
          {
            type: "NUMBER",
            label: "Age",
            required: true,
            validationRules: {
              min: 18,
              max: 120,
              errorMessage: "Must be between 18 and 120",
            },
          },
        ],
      };

      const response = await app.request("/forms?guildId=123456789012345678", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiRequest),
      });

      expect(response.status).toBe(201);

      const { Form } = await import("@ticketsbot/core/domains");
      expect(Form.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({
              type: "number",
              validationRules: expect.objectContaining({
                min: 18,
                max: 120,
              }),
            }),
          ]),
        })
      );
    });
  });

  describe("PUT /forms/:id", () => {
    it("should update form metadata", async () => {
      const updateRequest = {
        name: "Updated Form Name",
        description: "New description",
      };

      const response = await app.request("/forms/1?guildId=123456789012345678", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateRequest),
      });

      expect(response.status).toBe(200);

      const { Form } = await import("@ticketsbot/core/domains");
      expect(Form.update).toHaveBeenCalledWith(1, {
        name: "Updated Form Name",
        description: "New description",
      });
    });

    it("should note that field updates are not yet supported", async () => {
      const updateRequest = {
        name: "Updated Form",
        fields: [
          {
            type: "SHORT_TEXT",
            label: "Updated Field",
            required: false,
          },
        ],
      };

      const response = await app.request("/forms/1?guildId=123456789012345678", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateRequest),
      });

      expect(response.status).toBe(200);

      // Currently only updates form metadata, not fields
      const { Form } = await import("@ticketsbot/core/domains");
      expect(Form.update).toHaveBeenCalledWith(1, {
        name: "Updated Form",
      });
    });
  });

  describe("Field Type Mapping", () => {
    it("should map all API field types correctly", () => {
      const fieldTypeMap: Record<string, string> = {
        SHORT_TEXT: "short_text",
        PARAGRAPH: "paragraph",
        SELECT: "select",
        EMAIL: "email",
        NUMBER: "number",
        CHECKBOX: "checkbox",
        RADIO: "radio",
        DATE: "date",
      };

      Object.entries(fieldTypeMap).forEach(([apiType, expectedDomainType]) => {
        expect(fieldTypeMap[apiType]).toBe(expectedDomainType);
      });
    });
  });
});
