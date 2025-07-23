import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { testClient } from "hono/testing";
import type { z } from "zod";
import {
  CreatePanelSchema,
  CreateFormSchema,
  TicketStatusSchema,
  type CreatePanelInput,
  type CreateFormInput,
} from "@ticketsbot/core";

// Mock the middleware and context
const mockAuth = () => async (c: any, next: any) => {
  c.set("user", { id: "123456789", email: "test@example.com" });
  c.set("session", { userId: "123456789" });
  c.set("guildId", "987654321098765432");
  await next();
};

const mockPermission = () => async (_c: any, next: any) => {
  await next();
};

// Create test app with mocked dependencies
const createTestApp = () => {
  const app = new Hono();

  // Mock middleware
  app.use("*", mockAuth());

  return app;
};

describe("API Schema Integration Tests", () => {
  describe("Panel Endpoints", () => {
    it("should accept valid panel creation with new schema structure", async () => {
      const validPanel: CreatePanelInput = {
        type: "SINGLE",
        title: "Support Panel",
        content: "Welcome to our support system",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        categoryId: "111111111111111111",
        buttonText: "Open Ticket",
        color: "#5865F2",
        emoji: "🎫",
        welcomeMessage: "Thank you for contacting support!",
        enabled: true,
      };

      // Validate against schema
      const result = CreatePanelSchema.safeParse(validPanel);
      expect(result.success).toBe(true);
    });

    it("should transform API panel structure to domain format", async () => {
      const apiPanelRequest = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Support",
          emoji: "🎫",
          buttonText: "Create Ticket",
          buttonColor: "#5865F2",
          categoryId: "111111111111111111",
          largeImageUrl: "https://example.com/banner.png",
          smallImageUrl: "https://example.com/thumb.png",
          hideMentions: true,
          questions: [
            {
              id: "1",
              type: "SHORT_TEXT",
              label: "What is your issue?",
              placeholder: "Describe your problem",
              enabled: true,
            },
          ],
        },
      };

      // This would be transformed by the API route
      // Test that the transformation produces valid domain input
      const domainInput = {
        type: apiPanelRequest.type as "SINGLE",
        guildId: apiPanelRequest.guildId,
        channelId: apiPanelRequest.channelId,
        title: apiPanelRequest.singlePanel.title,
        emoji: apiPanelRequest.singlePanel.emoji,
        buttonText: apiPanelRequest.singlePanel.buttonText,
        color: apiPanelRequest.singlePanel.buttonColor,
        categoryId: apiPanelRequest.singlePanel.categoryId,
        imageUrl: apiPanelRequest.singlePanel.largeImageUrl,
        thumbnailUrl: apiPanelRequest.singlePanel.smallImageUrl,
        hideMentions: apiPanelRequest.singlePanel.hideMentions,
        enabled: true,
      };

      const result = CreatePanelSchema.safeParse(domainInput);
      expect(result.success).toBe(true);
    });

    it("should handle multi-panel structure", async () => {
      const multiPanelRequest = {
        type: "MULTI",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        multiPanel: {
          title: "Support Categories",
          description: "Choose a support category",
          selectMenuTitle: "Select Category",
          selectMenuPlaceholder: "Choose...",
          panels: [
            {
              title: "Technical Support",
              description: "Get help with technical issues",
              emoji: "🔧",
              categoryId: "111111111111111111",
            },
            {
              title: "Billing Support",
              description: "Questions about your subscription",
              emoji: "💰",
              categoryId: "222222222222222222",
            },
          ],
        },
      };

      // Transform to domain format
      const domainInput = {
        type: multiPanelRequest.type as "MULTI",
        guildId: multiPanelRequest.guildId,
        channelId: multiPanelRequest.channelId,
        title: multiPanelRequest.multiPanel.title,
        content: multiPanelRequest.multiPanel.description,
        buttonText: multiPanelRequest.multiPanel.selectMenuPlaceholder || "Select",
        enabled: true,
      };

      const result = CreatePanelSchema.safeParse(domainInput);
      expect(result.success).toBe(true);
    });
  });

  describe("Form Endpoints", () => {
    it("should accept valid form creation with domain schema", async () => {
      const validForm: CreateFormInput = {
        guild_id: "123456789012345678",
        name: "Bug Report Form",
        description: "Please provide details about the bug",
        is_active: true,
      };

      const result = CreateFormSchema.safeParse(validForm);
      expect(result.success).toBe(true);
    });

    it("should handle form with fields using transformed types", async () => {
      const apiFormRequest = {
        name: "Support Form",
        description: "Fill out this form for support",
        fields: [
          {
            type: "SHORT_TEXT",
            label: "Your Name",
            placeholder: "Enter your name",
            required: true,
            validationRules: {
              minLength: 2,
              maxLength: 50,
            },
          },
          {
            type: "PARAGRAPH",
            label: "Describe Your Issue",
            placeholder: "Please be detailed",
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

      // Transform to domain format (as done in the route)
      const domainForm = {
        guild_id: "123456789012345678",
        name: apiFormRequest.name,
        description: apiFormRequest.description,
        is_active: true,
      };

      const result = CreateFormSchema.safeParse(domainForm);
      expect(result.success).toBe(true);

      // Field types would be transformed
      const fieldTypeMap: Record<string, string> = {
        SHORT_TEXT: "TEXT",
        PARAGRAPH: "TEXT_AREA",
        SELECT: "SELECT",
      };

      apiFormRequest.fields.forEach((field) => {
        const domainType = fieldTypeMap[field.type];
        expect(domainType).toBeDefined();
      });
    });
  });

  describe("Ticket Endpoints", () => {
    it("should use correct ticket status enum values", async () => {
      const validStatuses = ["OPEN", "CLAIMED", "CLOSED", "PENDING"];

      validStatuses.forEach((status) => {
        const result = TicketStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });

      // Invalid status should fail
      const invalidResult = TicketStatusSchema.safeParse("INVALID_STATUS");
      expect(invalidResult.success).toBe(false);
    });

    it("should handle ticket query parameters correctly", async () => {
      const queryParams = {
        guildId: "123456789012345678",
        status: "OPEN",
      };

      // Validate status
      const statusResult = TicketStatusSchema.safeParse(queryParams.status);
      expect(statusResult.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should provide clear validation errors for invalid schemas", async () => {
      const invalidPanel = {
        type: "INVALID_TYPE",
        title: "", // Empty title
        guildId: "not-a-valid-id",
        channelId: "987654321098765432",
      };

      const result = CreatePanelSchema.safeParse(invalidPanel);
      expect(result.success).toBe(false);

      if (!result.success && result.error) {
        // Check that we have validation errors
        const errors = result.error.issues || result.error.errors || [];
        expect(errors.length).toBeGreaterThan(0);
        // Check for specific field errors
        const errorPaths = errors.map((e) => e.path.join("."));
        expect(errorPaths.some((p) => p.includes("type"))).toBe(true);
        expect(errorPaths.some((p) => p.includes("title"))).toBe(true);
        expect(errorPaths.some((p) => p.includes("guildId"))).toBe(true);
      }
    });

    it("should handle nullable vs undefined fields correctly", async () => {
      const panelWithNulls = {
        type: "SINGLE" as const,
        title: "Test Panel",
        content: null, // Nullable
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        categoryId: null, // Nullable
        buttonText: "Click Me",
        emoji: null, // Nullable
        enabled: true,
      };

      const result = CreatePanelSchema.safeParse(panelWithNulls);
      expect(result.success).toBe(true);
    });
  });

  describe("Schema Compatibility", () => {
    it("should ensure all required fields are present", async () => {
      // Minimal valid panel
      const minimalPanel = {
        type: "SINGLE" as const,
        title: "Minimal Panel",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        buttonText: "Open",
      };

      const result = CreatePanelSchema.safeParse(minimalPanel);
      expect(result.success).toBe(true);
    });

    it("should validate field type transformations", async () => {
      const apiFieldTypes = [
        "SHORT_TEXT",
        "PARAGRAPH",
        "SELECT",
        "EMAIL",
        "NUMBER",
        "CHECKBOX",
        "RADIO",
        "DATE",
      ];

      const domainFieldTypes = [
        "TEXT",
        "TEXT_AREA",
        "SELECT",
        "EMAIL",
        "NUMBER",
        "CHECKBOX",
        "RADIO",
        "DATE",
      ];

      // Ensure we have a mapping for each API type
      const fieldTypeMap: Record<string, string> = {
        SHORT_TEXT: "TEXT",
        PARAGRAPH: "TEXT_AREA",
        SELECT: "SELECT",
        EMAIL: "EMAIL",
        NUMBER: "NUMBER",
        CHECKBOX: "CHECKBOX",
        RADIO: "RADIO",
        DATE: "DATE",
      };

      apiFieldTypes.forEach((apiType) => {
        const domainType = fieldTypeMap[apiType];
        expect(domainType).toBeDefined();
        expect(domainFieldTypes).toContain(domainType);
      });
    });
  });
});
