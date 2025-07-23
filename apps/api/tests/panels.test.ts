import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { panels } from "../src/routes/panels";
import { transformApiPanelToDomain } from "../src/utils/schema-transforms";
import type { CreatePanelInput } from "@ticketsbot/core";

// Mock dependencies
vi.mock("@ticketsbot/core/domains/panel", () => ({
  Panel: {
    list: vi.fn().mockResolvedValue([
      {
        id: 1,
        type: "SINGLE",
        title: "Test Panel",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        enabled: true,
      },
    ]),
    getById: vi.fn().mockResolvedValue({
      id: 1,
      type: "SINGLE",
      title: "Test Panel",
      guildId: "123456789012345678",
      channelId: "987654321098765432",
      enabled: true,
    }),
    create: vi.fn().mockImplementation((input: CreatePanelInput) => ({
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
    deploy: vi.fn().mockResolvedValue({
      panelData: { id: 1, title: "Test Panel" },
    }),
  },
}));

vi.mock("@ticketsbot/core/discord", () => ({
  Discord: {
    deployPanel: vi.fn().mockResolvedValue({
      messageId: "123123123123",
      channelId: "987654321098765432",
    }),
  },
}));

// Mock middleware
vi.mock("../src/middleware/context", () => ({
  requireAuth: vi.fn((c: any, next: any) => next()),
  requirePermission: vi.fn(() => (c: any, next: any) => next()),
}));

// Mock error guard
vi.mock("../src/utils/error-guards", () => ({
  isErrorWithCode: vi.fn((error: any) => error.code !== undefined),
}));

describe("Panel Routes", () => {
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

    app.route("/panels", panels);
  });

  describe("GET /panels", () => {
    it("should list panels for a guild", async () => {
      const response = await app.request("/panels?guildId=123456789012345678");

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        id: 1,
        type: "SINGLE",
        title: "Test Panel",
      });
    });

    it("should reject invalid guild ID", async () => {
      const response = await app.request("/panels?guildId=invalid");
      expect(response.status).toBe(400);
    });
  });

  describe("POST /panels", () => {
    it("should create panel with API structure and transform to domain", async () => {
      const apiRequest = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Support Panel",
          emoji: "🎫",
          buttonText: "Create Ticket",
          buttonColor: "#5865F2",
          categoryId: "111111111111111111",
          largeImageUrl: "https://example.com/image.png",
          hideMentions: true,
          questions: [
            {
              id: "1",
              type: "SHORT_TEXT",
              label: "What is your issue?",
              placeholder: "Describe here",
              enabled: true,
            },
          ],
        },
      };

      const response = await app.request("/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiRequest),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      // Verify transformation happened
      const { Panel } = await import("@ticketsbot/core/domains/panel");
      expect(Panel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SINGLE",
          title: "Support Panel",
          emoji: "🎫",
          buttonText: "Create Ticket",
          color: "#5865F2",
          imageUrl: "https://example.com/image.png",
          hideMentions: true,
        })
      );
    });

    it("should handle multi-panel creation", async () => {
      const apiRequest = {
        type: "MULTI",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        multiPanel: {
          title: "Support Categories",
          description: "Choose a category",
          selectMenuTitle: "Select Category",
          selectMenuPlaceholder: "Choose...",
          panels: [
            {
              title: "Technical",
              emoji: "🔧",
              categoryId: "111111111111111111",
            },
          ],
        },
      };

      const response = await app.request("/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiRequest),
      });

      expect(response.status).toBe(201);

      const { Panel } = await import("@ticketsbot/core/domains/panel");
      expect(Panel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MULTI",
          title: "Support Categories",
          content: "Choose a category",
        })
      );
    });

    it("should reject invalid panel data", async () => {
      const invalidRequest = {
        type: "INVALID_TYPE",
        guildId: "not-a-snowflake",
        channelId: "987654321098765432",
      };

      const response = await app.request("/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidRequest),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /panels/:id", () => {
    it("should update panel with transformed fields", async () => {
      const updateRequest = {
        title: "Updated Title",
        channel: "111111111111111111", // API uses 'channel'
        category: "222222222222222222", // API uses 'category'
        color: "#FF0000",
        emoji: "🎟️",
      };

      const response = await app.request("/panels/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateRequest),
      });

      expect(response.status).toBe(200);

      const { Panel } = await import("@ticketsbot/core/domains/panel");
      expect(Panel.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: "Updated Title",
          channelId: "111111111111111111", // Transformed to channelId
          categoryId: "222222222222222222", // Transformed to categoryId
          color: "#FF0000",
          emoji: "🎟️",
        })
      );
    });
  });

  describe("Schema Transformation", () => {
    it("should correctly transform API panel to domain format", () => {
      const apiPanel = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Test",
          emoji: "🎫",
          buttonText: "Click",
          buttonColor: "#5865F2",
          largeImageUrl: "https://example.com/large.png",
          smallImageUrl: "https://example.com/small.png",
          hideMentions: true,
          accessControl: {
            allowEveryone: false,
            roles: ["111111111111111111"],
          },
        },
      };

      const domainPanel = transformApiPanelToDomain(apiPanel);

      expect(domainPanel).toMatchObject({
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        title: "Test",
        emoji: "🎫",
        buttonText: "Click",
        color: "#5865F2",
        imageUrl: "https://example.com/large.png",
        thumbnailUrl: "https://example.com/small.png",
        hideMentions: true,
      });
    });

    it("should handle undefined/null values correctly", () => {
      const apiPanel = {
        type: "SINGLE",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        singlePanel: {
          title: "Test",
          buttonText: "Click",
          emoji: undefined,
          buttonColor: undefined,
          largeImageUrl: undefined,
        },
      };

      const domainPanel = transformApiPanelToDomain(apiPanel);

      expect(domainPanel.emoji).toBe(null);
      expect(domainPanel.color).toBe(null);
      expect(domainPanel.imageUrl).toBe(null);
    });
  });
});
