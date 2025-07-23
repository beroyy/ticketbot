import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  CreatePanelSchema,
  UpdatePanelSchema,
  CreateFormSchema,
  UpdateFormSchema,
  CreateFormFieldSchema,
  DomainFormFieldTypeSchema,
  TicketStatusSchema,
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  FormFieldValidationSchema,
} from "@ticketsbot/core";
import {
  transformApiPanelToDomain,
  transformDomainPanelToApi,
  transformApiFieldToDomain,
  transformDomainFieldToApi,
  API_TO_DOMAIN_FIELD_TYPE,
  DOMAIN_TO_API_FIELD_TYPE,
  COMMON_TO_DOMAIN_FIELD_TYPE,
} from "../src/utils/schema-transforms";

describe("Schema Compatibility Tests", () => {
  describe("Core Schema Validations", () => {
    it("should validate Discord IDs correctly", () => {
      // Valid Discord snowflakes
      const validIds = ["123456789012345678", "987654321098765432", "111111111111111111"];

      validIds.forEach((id) => {
        expect(DiscordGuildIdSchema.safeParse(id).success).toBe(true);
        expect(DiscordChannelIdSchema.safeParse(id).success).toBe(true);
      });

      // Invalid IDs (current schema only validates numeric string format)
      const invalidIds = [
        "not-a-number", // Non-numeric
        "123abc456", // Contains letters
        "", // Empty string
        null,
        undefined,
        123456789012345678, // Number instead of string
      ];

      invalidIds.forEach((id) => {
        expect(DiscordGuildIdSchema.safeParse(id).success).toBe(false);
        expect(DiscordChannelIdSchema.safeParse(id).success).toBe(false);
      });
    });

    it("should validate ticket statuses", () => {
      const validStatuses = ["OPEN", "CLAIMED", "CLOSED", "PENDING"];
      validStatuses.forEach((status) => {
        expect(TicketStatusSchema.safeParse(status).success).toBe(true);
      });

      const invalidStatuses = ["ARCHIVED", "open", "closed", "invalid"];
      invalidStatuses.forEach((status) => {
        expect(TicketStatusSchema.safeParse(status).success).toBe(false);
      });
    });

    it("should validate form field types", () => {
      const validTypes = [
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

      validTypes.forEach((type) => {
        expect(DomainFormFieldTypeSchema.safeParse(type).success).toBe(true);
      });

      const invalidTypes = ["SHORT_TEXT", "PARAGRAPH", "text", "textarea"];
      invalidTypes.forEach((type) => {
        expect(DomainFormFieldTypeSchema.safeParse(type).success).toBe(false);
      });
    });
  });

  describe("Panel Schema Transformations", () => {
    it("should transform complete API panel to domain format", () => {
      const apiPanel = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Support Panel",
          emoji: "🎫",
          buttonText: "Create Ticket",
          buttonColor: "#5865F2",
          categoryId: "111111111111111111",
          questions: [],
          mentionOnOpen: "222222222222222222",
          hideMentions: true,
          ticketCategory: "333333333333333333",
          largeImageUrl: "https://example.com/banner.png",
          smallImageUrl: "https://example.com/thumb.png",
          textSections: [
            { name: "Rules", value: "Be respectful" },
            { name: "Hours", value: "9-5 EST" },
          ],
        },
      };

      const domainPanel = transformApiPanelToDomain(apiPanel);

      // Validate against domain schema
      const result = CreatePanelSchema.safeParse(domainPanel);
      if (!result.success) {
        console.error("Validation errors:", result.error.format());
      }
      expect(result.success).toBe(true);

      // Check specific transformations
      expect(domainPanel.type).toBe("SINGLE");
      expect(domainPanel.title).toBe("Support Panel");
      expect(domainPanel.color).toBe("#5865F2"); // buttonColor -> color
      expect(domainPanel.imageUrl).toBe("https://example.com/banner.png"); // largeImageUrl -> imageUrl
      expect(domainPanel.thumbnailUrl).toBe("https://example.com/thumb.png"); // smallImageUrl -> thumbnailUrl
      expect(domainPanel.hideMentions).toBe(true);
    });

    it("should transform multi-panel structure", () => {
      const apiPanel = {
        type: "MULTI",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        multiPanel: {
          title: "Support Categories",
          description: "Select a category below",
          selectMenuTitle: "Choose Category",
          selectMenuPlaceholder: "Select...",
          panels: [
            {
              id: "1",
              title: "Technical Support",
              description: "Help with technical issues",
              emoji: "🔧",
              categoryId: "111111111111111111",
            },
            {
              id: "2",
              title: "Billing",
              description: "Billing questions",
              emoji: "💰",
              categoryId: "222222222222222222",
            },
          ],
        },
      };

      const domainPanel = transformApiPanelToDomain(apiPanel);

      expect(domainPanel.type).toBe("MULTI");
      expect(domainPanel.title).toBe("Support Categories");
      expect(domainPanel.content).toBe("Select a category below");
    });

    it("should handle domain to API transformation", () => {
      const domainPanel = {
        id: 1,
        type: "SINGLE" as const,
        title: "Test Panel",
        content: "Test content",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        categoryId: "111111111111111111",
        formId: 123,
        emoji: "🎫",
        buttonText: "Click Me",
        color: "#5865F2",
        welcomeMessage: "Welcome!",
        imageUrl: "https://example.com/image.png",
        thumbnailUrl: "https://example.com/thumb.png",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const apiPanel = transformDomainPanelToApi(domainPanel);

      expect(apiPanel.id).toBe(1);
      expect(apiPanel.type).toBe("SINGLE");
      expect(apiPanel.title).toBe("Test Panel");
      expect(apiPanel.imageUrl).toBe("https://example.com/image.png");
      expect(apiPanel.thumbnailUrl).toBe("https://example.com/thumb.png");
    });
  });

  describe("Form Field Transformations", () => {
    it("should transform all API field types to domain", () => {
      Object.entries(API_TO_DOMAIN_FIELD_TYPE).forEach(([apiType, domainType]) => {
        const apiField = {
          type: apiType,
          label: `${apiType} Field`,
          placeholder: "Test",
          helpText: "Help text",
          required: true,
          validationRules: {
            minLength: 5,
            maxLength: 100,
          },
          position: 0,
        };

        const domainField = transformApiFieldToDomain(apiField);

        expect(domainField.field_type).toBe(domainType);
        expect(domainField.label).toBe(`${apiType} Field`);
        expect(domainField.placeholder).toBe("Test");
        expect(domainField.help_text).toBe("Help text");
        expect(domainField.validation_rules.required).toBe(true);
      });
    });

    it("should transform domain fields back to API format", () => {
      const domainField = {
        id: 1,
        field_type: "TEXT" as const,
        label: "Name Field",
        placeholder: "Enter name",
        help_text: "Your full name",
        validation_rules: {
          required: true,
          minLength: 2,
          maxLength: 50,
          pattern: "^[a-zA-Z\\s]+$",
          errorMessage: "Invalid name",
        },
        position: 0,
      };

      const apiField = transformDomainFieldToApi(domainField);

      expect(apiField.type).toBe("SHORT_TEXT"); // TEXT -> SHORT_TEXT
      expect(apiField.label).toBe("Name Field");
      expect(apiField.placeholder).toBe("Enter name");
      expect(apiField.helpText).toBe("Your full name"); // help_text -> helpText
      expect(apiField.required).toBe(true);
      expect(apiField.validationRules?.minLength).toBe(2);
    });

    it("should handle select field options", () => {
      const apiField = {
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
        position: 0,
      };

      const domainField = transformApiFieldToDomain(apiField);

      expect(domainField.field_type).toBe("SELECT");
      expect(domainField.validation_rules.options).toEqual([
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ]);
    });
  });

  describe("Form Schema Validations", () => {
    it("should validate form creation with all fields", () => {
      const validForm: CreateFormInput = {
        guild_id: "123456789012345678",
        name: "Complete Form",
        description: "A form with all field types",
        is_active: true,
        metadata: {
          category: "support",
          version: 1,
        },
      };

      const result = CreateFormSchema.safeParse(validForm);
      expect(result.success).toBe(true);
    });

    it("should validate form field creation", () => {
      const validField = {
        form_id: 1,
        label: "Email Address",
        placeholder: "your@email.com",
        help_text: "We'll use this to contact you",
        field_type: "EMAIL" as const,
        validation_rules: {
          required: true,
          errorMessage: "Please enter a valid email",
        },
        position: 0,
      };

      const result = CreateFormFieldSchema.safeParse(validField);
      expect(result.success).toBe(true);
    });

    it("should validate form field validation rules", () => {
      const validationRules = {
        required: true,
        min: 0,
        max: 100,
        minLength: 1,
        maxLength: 255,
        pattern: "^[A-Za-z]+$",
        options: [
          { label: "Option 1", value: "1" },
          { label: "Option 2", value: "2" },
        ],
        errorMessage: "Custom error message",
      };

      const result = FormFieldValidationSchema.safeParse(validationRules);
      expect(result.success).toBe(true);
    });
  });

  describe("Field Type Mappings", () => {
    it("should have complete API to domain mappings", () => {
      const expectedMappings = {
        SHORT_TEXT: "TEXT",
        PARAGRAPH: "TEXT_AREA",
        SELECT: "SELECT",
        EMAIL: "EMAIL",
        NUMBER: "NUMBER",
        CHECKBOX: "CHECKBOX",
        RADIO: "RADIO",
        DATE: "DATE",
      };

      Object.entries(expectedMappings).forEach(([api, domain]) => {
        expect(API_TO_DOMAIN_FIELD_TYPE[api]).toBe(domain);
      });
    });

    it("should have reverse domain to API mappings", () => {
      const domainTypes = [
        "TEXT",
        "TEXT_AREA",
        "SELECT",
        "EMAIL",
        "URL",
        "NUMBER",
        "CHECKBOX",
        "RADIO",
        "DATE",
        "TIME",
        "DATETIME",
      ];

      domainTypes.forEach((domainType) => {
        expect(
          DOMAIN_TO_API_FIELD_TYPE[domainType as keyof typeof DOMAIN_TO_API_FIELD_TYPE]
        ).toBeDefined();
      });
    });

    it("should have common to domain mappings", () => {
      const commonTypes = Object.keys(COMMON_TO_DOMAIN_FIELD_TYPE);
      expect(commonTypes).toContain("short_text");
      expect(commonTypes).toContain("paragraph");
      expect(commonTypes).toContain("select");

      expect(COMMON_TO_DOMAIN_FIELD_TYPE["short_text"]).toBe("TEXT");
      expect(COMMON_TO_DOMAIN_FIELD_TYPE["paragraph"]).toBe("TEXT_AREA");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null and undefined values in transformations", () => {
      const apiPanel = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Test",
          buttonText: "Click",
          emoji: null,
          categoryId: undefined,
          largeImageUrl: null,
          textSections: undefined,
        },
      };

      const domainPanel = transformApiPanelToDomain(apiPanel);

      expect(domainPanel.emoji).toBe(null);
      expect(domainPanel.categoryId).toBe(null);
      expect(domainPanel.imageUrl).toBe(null);
      expect(domainPanel.textSections).toBe(null);
    });

    it("should validate hex color formats", () => {
      const validColors = ["#5865F2", "#FF0000", "#00FF00", "#123ABC"];
      const invalidColors = ["red", "5865F2", "#GGGGGG", "#12345"];

      validColors.forEach((color) => {
        const panel = {
          type: "SINGLE" as const,
          title: "Test",
          guildId: "123456789012345678",
          channelId: "987654321098765432",
          buttonText: "Click",
          color,
        };
        expect(CreatePanelSchema.safeParse(panel).success).toBe(true);
      });

      invalidColors.forEach((color) => {
        const panel = {
          type: "SINGLE" as const,
          title: "Test",
          guildId: "123456789012345678",
          channelId: "987654321098765432",
          buttonText: "Click",
          color,
        };
        expect(CreatePanelSchema.safeParse(panel).success).toBe(false);
      });
    });
  });
});
