import { describe, it, expect } from "vitest";
import {
  CreatePanelSchema,
  CreateFormSchema,
  CreateFormFieldSchema,
  DomainFormFieldTypeSchema,
  TicketStatusSchema,
} from "@ticketsbot/core";
import {
  transformApiPanelToDomain,
  transformApiFieldToDomain,
  API_TO_DOMAIN_FIELD_TYPE,
} from "../../utils/schema-transforms";

describe("Schema Validation Tests", () => {
  describe("Panel Schemas", () => {
    it("should validate correct panel creation input", () => {
      const validInput = {
        type: "SINGLE" as const,
        title: "Support Panel",
        content: "Click the button below to create a ticket",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        categoryId: "111111111111111111",
        buttonText: "Create Ticket",
        color: "#5865F2",
        welcomeMessage: "Welcome to support!",
        enabled: true,
      };

      const result = CreatePanelSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject invalid Discord IDs", () => {
      const invalidInput = {
        type: "SINGLE" as const,
        title: "Support Panel",
        guildId: "invalid-id",
        channelId: "987654321098765432",
        buttonText: "Create Ticket",
      };

      const result = CreatePanelSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should transform API panel to domain format correctly", () => {
      const apiPanel = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Support",
          emoji: "🎫",
          buttonText: "Open Ticket",
          buttonColor: "#5865F2",
          categoryId: "111111111111111111",
          largeImageUrl: "https://example.com/image.png",
          hideMentions: true,
        },
      };

      const domainPanel = transformApiPanelToDomain(apiPanel);

      expect(domainPanel.type).toBe("SINGLE");
      expect(domainPanel.title).toBe("Support");
      expect(domainPanel.emoji).toBe("🎫");
      expect(domainPanel.buttonText).toBe("Open Ticket");
      expect(domainPanel.color).toBe("#5865F2");
      expect(domainPanel.imageUrl).toBe("https://example.com/image.png");
      expect(domainPanel.hideMentions).toBe(true);
    });
  });

  describe("Form Schemas", () => {
    it("should validate correct form creation input", () => {
      const validInput = {
        guild_id: "123456789012345678",
        name: "Bug Report Form",
        description: "Please fill out this form to report a bug",
        is_active: true,
      };

      const result = CreateFormSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate form field creation", () => {
      const validField = {
        form_id: 1,
        label: "What is the bug?",
        placeholder: "Describe the bug here",
        help_text: "Be as detailed as possible",
        field_type: "TEXT_AREA" as const,
        validation_rules: {
          required: true,
          minLength: 10,
          maxLength: 1000,
          errorMessage: "Please provide a detailed description",
        },
        position: 0,
      };

      const result = CreateFormFieldSchema.safeParse(validField);
      expect(result.success).toBe(true);
    });

    it("should validate all domain form field types", () => {
      const fieldTypes = [
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
      ];

      fieldTypes.forEach((type) => {
        const result = DomainFormFieldTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it("should transform API field types to domain correctly", () => {
      const apiFieldTypes = Object.keys(API_TO_DOMAIN_FIELD_TYPE);

      apiFieldTypes.forEach((apiType) => {
        const domainType = API_TO_DOMAIN_FIELD_TYPE[apiType];
        expect(domainType).toBeDefined();

        // Verify the domain type is valid
        const result = DomainFormFieldTypeSchema.safeParse(domainType);
        expect(result.success).toBe(true);
      });
    });

    it("should transform API form field to domain format", () => {
      const apiField = {
        type: "SHORT_TEXT",
        label: "Your Name",
        placeholder: "Enter your name",
        helpText: "First and last name",
        required: true,
        validationRules: {
          minLength: 2,
          maxLength: 50,
          pattern: "^[a-zA-Z\\s]+$",
          errorMessage: "Please enter a valid name",
        },
        position: 0,
      };

      const domainField = transformApiFieldToDomain(apiField);

      expect(domainField.field_type).toBe("TEXT");
      expect(domainField.label).toBe("Your Name");
      expect(domainField.placeholder).toBe("Enter your name");
      expect(domainField.help_text).toBe("First and last name");
      expect(domainField.validation_rules.required).toBe(true);
      expect(domainField.validation_rules.minLength).toBe(2);
      expect(domainField.validation_rules.maxLength).toBe(50);
    });
  });

  describe("Ticket Schemas", () => {
    it("should validate all ticket status values", () => {
      const statuses = ["OPEN", "CLAIMED", "CLOSED"];

      statuses.forEach((status) => {
        const result = TicketStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid ticket status", () => {
      const result = TicketStatusSchema.safeParse("INVALID_STATUS");
      expect(result.success).toBe(false);
    });
  });

  describe("Schema Compatibility", () => {
    it("should ensure API and domain schemas are compatible", () => {
      // Test that a full API request can be transformed to domain format
      const apiRequest = {
        type: "MULTI",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        multiPanel: {
          title: "Support Categories",
          description: "Select a category",
          selectMenuTitle: "Choose Category",
          selectMenuPlaceholder: "Select...",
          panels: [
            {
              title: "Technical Support",
              description: "Get help with technical issues",
              emoji: "🔧",
              categoryId: "111111111111111111",
            },
            {
              title: "Billing",
              description: "Questions about billing",
              emoji: "💰",
              categoryId: "222222222222222222",
            },
          ],
        },
      };

      const domainInput = transformApiPanelToDomain(apiRequest);

      // Verify the transformed input is valid for the domain schema
      const result = CreatePanelSchema.safeParse(domainInput);
      expect(result.success).toBe(true);
    });

    it("should handle nullable fields correctly", () => {
      const apiPanel = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Support",
          buttonText: "Create Ticket",
          // These should become null in domain
          emoji: undefined,
          categoryId: undefined,
          largeImageUrl: undefined,
        },
      };

      const domainPanel = transformApiPanelToDomain(apiPanel);

      expect(domainPanel.emoji).toBe(null);
      expect(domainPanel.categoryId).toBe(null);
      expect(domainPanel.imageUrl).toBe(null);
    });
  });
});
