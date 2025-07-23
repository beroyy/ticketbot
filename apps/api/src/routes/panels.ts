import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Panel } from "@ticketsbot/core/domains/panel";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  UpdatePanelSchema,
  PermissionFlags,
} from "@ticketsbot/core";
import { Discord } from "@ticketsbot/core/discord";
import { requireAuth, requirePermission } from "../middleware/context";
import type { AuthSession } from "@ticketsbot/core/auth";
import { isErrorWithCode } from "../utils/error-guards";
import { transformApiPanelToDomain } from "../utils/schema-transforms";
import { patterns } from "../utils/validation";

// Sub-schemas for better organization
const PanelQuestionSchema = z
  .object({
    id: z.string().describe("Unique question ID"),
    type: z.enum(["SHORT_TEXT", "PARAGRAPH"]).describe("Question input type"),
    label: z.string().min(1).max(200).describe("Question label"),
    placeholder: z.string().max(100).optional().describe("Placeholder text"),
    enabled: z.boolean().default(true).describe("Whether question is enabled"),
    characterLimit: z.number().min(1).max(1000).optional().describe("Character limit for response"),
  })
  .refine((q) => q.label.trim().length > 0, { message: "Question label cannot be empty" });

const TextSectionSchema = z.object({
  name: z.string().min(1).max(50).describe("Section identifier"),
  value: z.string().min(1).max(1000).describe("Section content"),
});

const SinglePanelConfigSchema = z
  .object({
    title: z.string().min(1).max(100).describe("Panel title"),
    emoji: z.string().max(4).optional().describe("Button emoji"),
    buttonText: z.string().min(1).max(80).optional().default("Create Ticket"),
    buttonColor: patterns.hexColor().optional().describe("Button color"),
    categoryId: DiscordChannelIdSchema.optional().describe("Ticket category channel"),
    questions: z.array(PanelQuestionSchema).max(10).optional(),
    mentionOnOpen: DiscordChannelIdSchema.optional().describe("Role to mention"),
    hideMentions: z.boolean().optional().default(false),
    ticketCategory: DiscordChannelIdSchema.optional(),
    largeImageUrl: z.url().optional().describe("Banner image URL"),
    smallImageUrl: z.url().optional().describe("Thumbnail image URL"),
    textSections: z.array(TextSectionSchema).max(5).optional(),
    // Deprecated/unused fields
    form: z.unknown().optional(),
    namingScheme: z.string().optional(),
    exitSurveyForm: z.unknown().optional(),
    awaitingResponseCategory: z.unknown().optional(),
    accessControl: z
      .object({
        allowEveryone: z.boolean().optional(),
        roles: z.array(DiscordChannelIdSchema).optional(),
      })
      .optional(),
  })
  .refine(
    (panel) => {
      // Ensure unique question IDs
      if (panel.questions) {
        const ids = panel.questions.map((q) => q.id);
        return ids.length === new Set(ids).size;
      }
      return true;
    },
    { message: "Question IDs must be unique" }
  );

const MultiPanelOptionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  emoji: z.string().max(4).optional(),
  categoryId: DiscordChannelIdSchema.optional(),
  introTitle: z.string().max(100).optional(),
  introDescription: z.string().max(500).optional(),
  channelPrefix: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Must be lowercase with hyphens only")
    .max(20)
    .optional(),
  mentionOnOpen: z.array(DiscordChannelIdSchema).optional(),
  hideMentions: z.boolean().optional().default(false),
  questions: z.array(PanelQuestionSchema).max(10).optional(),
});

const MultiPanelConfigSchema = z
  .object({
    title: z.string().min(1).max(100),
    description: z.string().max(200).optional(),
    selectMenuTitle: z.string().min(1).max(50),
    selectMenuPlaceholder: z.string().max(100).optional(),
    panels: z.array(MultiPanelOptionSchema).min(1).max(25),
  })
  .refine(
    (config) => {
      // Ensure unique panel titles
      const titles = config.panels.map((p) => p.title.toLowerCase());
      return titles.length === new Set(titles).size;
    },
    { message: "Panel option titles must be unique" }
  );

// Main create panel schema
const ApiCreatePanelSchema = z
  .object({
    type: z.enum(["SINGLE", "MULTI"]).optional().default("SINGLE"),
    guildId: DiscordGuildIdSchema,
    channelId: DiscordChannelIdSchema,
    welcomeMessage: z
      .object({
        title: z.string().optional(),
        content: z.string().optional(),
        fields: z
          .array(
            z.object({
              name: z.string(),
              value: z.string(),
            })
          )
          .optional(),
      })
      .optional(),
    singlePanel: SinglePanelConfigSchema.optional(),
    multiPanel: MultiPanelConfigSchema.optional(),
  })
  .refine(
    (data) => {
      // Ensure correct panel config is provided based on type
      if (data.type === "SINGLE") {
        return !!data.singlePanel;
      } else if (data.type === "MULTI") {
        return !!data.multiPanel;
      }
      return false;
    },
    { message: "Panel configuration must match the panel type" }
  );

const ApiUpdatePanelSchema = UpdatePanelSchema.omit({ id: true }).extend({
  channel: z.string().optional(),
  questions: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["SHORT_TEXT", "PARAGRAPH"]),
        label: z.string(),
        placeholder: z.string(),
        enabled: z.boolean(),
        characterLimit: z.number().optional(),
      })
    )
    .optional(),
  category: z.string().optional(),
});

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

export const panels: Hono<{ Variables: Variables }> = new Hono<{ Variables: Variables }>();

// GET /panels - List panels for a guild
panels.get(
  "/",
  requireAuth,
  zValidator(
    "query",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    try {
      const { guildId } = c.req.valid("query");

      // Set guild context for domain methods
      c.set("guildId", guildId);

      const panels = await Panel.list();
      return c.json(panels);
    } catch (error) {
      console.error("Error fetching panels:", error);
      return c.json({ error: "Failed to fetch panels" }, 500);
    }
  }
);

// GET /panels/:id - Get a specific panel
panels.get(
  "/:id",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: z.string().transform((val) => parseInt(val, 10)),
    })
  ),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const panel = await Panel.getById(id);
      return c.json(panel);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        return c.json({ error: "Panel not found" }, 404);
      }
      if (isErrorWithCode(error) && error.code === "permission_denied") {
        return c.json({ error: error.message }, 403);
      }
      console.error("Error fetching panel:", error);
      return c.json({ error: "Failed to fetch panel" }, 500);
    }
  }
);

// Async validation for panel creation
const createPanelWithAsyncValidation = async (input: z.infer<typeof ApiCreatePanelSchema>) => {
  // TODO: Add channel validation once Discord.channelExists is implemented
  // For now, we'll skip channel validation and let the domain layer handle it

  // Future implementation:
  // - Validate that the channel exists in the guild
  // - Validate category channels if provided
  // - For multi panels, validate all category IDs

  return input;
};

// POST /panels - Create a new panel
panels.post(
  "/",
  requireAuth,
  requirePermission(PermissionFlags.PANEL_CREATE),
  zValidator("json", ApiCreatePanelSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");

      // Set guild context
      c.set("guildId", input.guildId);

      // Perform async validation
      await createPanelWithAsyncValidation(input);

      // Transform API input to domain format
      const domainInput = transformApiPanelToDomain(input);

      const panel = await Panel.create(domainInput);

      return c.json(panel, 201);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "validation_error") {
        return c.json({ error: error.message }, 400);
      }
      if (isErrorWithCode(error) && error.code === "permission_denied") {
        return c.json({ error: error.message }, 403);
      }
      console.error("Error creating panel:", error);
      return c.json({ error: "Failed to create panel" }, 500);
    }
  }
);

// PUT /panels/:id - Update a panel
panels.put(
  "/:id",
  requireAuth,
  requirePermission(PermissionFlags.PANEL_EDIT),
  zValidator(
    "param",
    z.object({
      id: z.string().transform((val) => parseInt(val, 10)),
    })
  ),
  zValidator("json", ApiUpdatePanelSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");

      // Check panel exists first
      await Panel.getById(id);

      // TODO: Add channel validation once Discord.channelExists is implemented
      // For now, we'll let the domain layer handle channel validation

      // Transform API update fields to domain format
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.channel !== undefined) updateData.channelId = input.channel;
      if (input.category !== undefined) updateData.categoryId = input.category;
      if (input.emoji !== undefined) updateData.emoji = input.emoji;
      if (input.buttonText !== undefined) updateData.buttonText = input.buttonText;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.welcomeMessage !== undefined) updateData.welcomeMessage = input.welcomeMessage;
      if (input.introTitle !== undefined) updateData.introTitle = input.introTitle;
      if (input.introDescription !== undefined)
        updateData.introDescription = input.introDescription;
      if (input.channelPrefix !== undefined) updateData.channelPrefix = input.channelPrefix;
      if (input.type !== undefined) updateData.type = input.type;

      const panel = await Panel.update(id, updateData);
      return c.json(panel);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        return c.json({ error: "Panel not found" }, 404);
      }
      if (isErrorWithCode(error) && error.code === "permission_denied") {
        return c.json({ error: error.message }, 403);
      }
      if (isErrorWithCode(error) && error.code === "validation_error") {
        return c.json({ error: error.message }, 400);
      }
      console.error("Error updating panel:", error);
      return c.json({ error: "Failed to update panel" }, 500);
    }
  }
);

// DELETE /panels/:id - Delete a panel
panels.delete(
  "/:id",
  requireAuth,
  requirePermission(PermissionFlags.PANEL_DELETE),
  zValidator(
    "param",
    z.object({
      id: z.string().transform((val) => parseInt(val, 10)),
    })
  ),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const result = await Panel.remove(id);
      return c.json(result);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        return c.json({ error: "Panel not found" }, 404);
      }
      if (isErrorWithCode(error) && error.code === "permission_denied") {
        return c.json({ error: error.message }, 403);
      }
      console.error("Error deleting panel:", error);
      return c.json({ error: "Failed to delete panel" }, 500);
    }
  }
);

// POST /panels/:id/deploy - Deploy a panel to Discord
panels.post(
  "/:id/deploy",
  requireAuth,
  requirePermission(PermissionFlags.PANEL_DEPLOY),
  zValidator(
    "param",
    z.object({
      id: z.string().transform((val) => parseInt(val, 10)),
    })
  ),
  async (c) => {
    try {
      const { id } = c.req.valid("param");

      // Get panel data for deployment
      const panelData = await Panel.deploy(id);

      // Deploy to Discord
      const result = await Discord.deployPanel(panelData);

      // Update panel with deployment info
      await Panel.update(id, {
        // Store deployment info if needed
      });

      return c.json({
        success: true,
        messageId: result.messageId,
        channelId: result.channelId,
      });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        return c.json({ error: "Panel not found" }, 404);
      }
      if (isErrorWithCode(error) && error.code === "permission_denied") {
        return c.json({ error: error.message }, 403);
      }
      console.error("Error deploying panel:", error);
      return c.json({ error: "Failed to deploy panel" }, 500);
    }
  }
);

// PUT /panels/:id/redeploy - Redeploy a panel to Discord
panels.put(
  "/:id/redeploy",
  requireAuth,
  requirePermission(PermissionFlags.PANEL_DEPLOY),
  zValidator(
    "param",
    z.object({
      id: z.string().transform((val) => parseInt(val, 10)),
    })
  ),
  zValidator(
    "json",
    z.object({
      messageId: z.string(),
    })
  ),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { messageId } = c.req.valid("json");

      // Get panel data
      const panelData = await Panel.deploy(id);

      // Update existing message
      const result = await Discord.updatePanel(panelData, messageId);

      return c.json({
        success: true,
        messageId: result.messageId,
        channelId: result.channelId,
      });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "not_found") {
        return c.json({ error: "Panel not found" }, 404);
      }
      if (isErrorWithCode(error) && error.code === "permission_denied") {
        return c.json({ error: error.message }, 403);
      }
      console.error("Error redeploying panel:", error);
      return c.json({ error: "Failed to redeploy panel" }, 500);
    }
  }
);
