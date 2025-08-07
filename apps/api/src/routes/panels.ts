import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Panel } from "@ticketsbot/core/domains/panel";
import { Discord } from "@ticketsbot/core/discord";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  UpdatePanelSchema,
  PermissionFlags,
} from "@ticketsbot/core";
import { createRoute } from "../factory";
import { ApiErrors } from "../utils/error-handler";
import { compositions, requirePermission } from "../middleware/context";
import { patterns } from "../utils/validation";

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
    // Deprecated fields
    form: z.unknown().optional(),
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
      const titles = config.panels.map((p) => p.title.toLowerCase());
      return titles.length === new Set(titles).size;
    },
    { message: "Panel option titles must be unique" }
  );

const CreatePanelSchema = z
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
      if (data.type === "SINGLE") {
        return !!data.singlePanel;
      } else if (data.type === "MULTI") {
        return !!data.multiPanel;
      }
      return false;
    },
    { message: "Panel configuration must match the panel type" }
  );

const UpdatePanelApiSchema = UpdatePanelSchema.omit({ id: true }).extend({
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

const transformApiPanelToDomain = (apiPanel: any) => {
  const basePanel = apiPanel.singlePanel || apiPanel.multiPanel || apiPanel;

  return {
    type: apiPanel.type || "SINGLE",
    title: basePanel.title || apiPanel.title,
    content: basePanel.description || basePanel.content || null,
    guildId: apiPanel.guildId,
    channelId: basePanel.channelId || apiPanel.channelId,
    categoryId: basePanel.categoryId || apiPanel.categoryId || null,
    formId: basePanel.formId || null,
    emoji: basePanel.emoji || null,
    buttonText: basePanel.buttonText || "Create Ticket",
    color: basePanel.buttonColor || basePanel.color || null,
    welcomeMessage: basePanel.welcomeMessage || null,
    introTitle: basePanel.introTitle || null,
    introDescription: basePanel.introDescription || null,
    channelPrefix: basePanel.channelPrefix || null,
    mentionRoles: basePanel.mentionRoles || null,
    hideMentions: basePanel.hideMentions || false,
    parentPanelId: apiPanel.parentPanelId || null,
    orderIndex: apiPanel.orderIndex || 0,
    enabled: apiPanel.enabled ?? true,
    permissions: basePanel.permissions || null,
    imageUrl: basePanel.largeImageUrl || basePanel.imageUrl || null,
    thumbnailUrl: basePanel.smallImageUrl || basePanel.thumbnailUrl || null,
    textSections: basePanel.textSections
      ? Array.isArray(basePanel.textSections)
        ? basePanel.textSections.reduce((acc: any, section: any) => {
            acc[section.name] = section.value;
            return acc;
          }, {})
        : basePanel.textSections
      : null,
  };
};

const transformUpdateData = (input: z.infer<typeof UpdatePanelApiSchema>) => {
  const updateData: Record<string, any> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.channel !== undefined) updateData.channelId = input.channel;
  if (input.category !== undefined) updateData.categoryId = input.category;
  if (input.emoji !== undefined) updateData.emoji = input.emoji;
  if (input.buttonText !== undefined) updateData.buttonText = input.buttonText;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.welcomeMessage !== undefined) updateData.welcomeMessage = input.welcomeMessage;
  if (input.introTitle !== undefined) updateData.introTitle = input.introTitle;
  if (input.introDescription !== undefined) updateData.introDescription = input.introDescription;
  if (input.channelPrefix !== undefined) updateData.channelPrefix = input.channelPrefix;
  if (input.type !== undefined) updateData.type = input.type;

  return updateData;
};

export const panelRoutes = createRoute()
  .get("/", ...compositions.guildScoped, async (c) => {
    const panels = await Panel.list();
    return c.json(panels);
  })

  .get(
    "/:id",
    ...compositions.authenticated,
    zValidator(
      "param",
      z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        const panel = await Panel.getById(id);
        return c.json(panel);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Panel");
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
    "/",
    ...compositions.guildScoped,
    requirePermission(PermissionFlags.PANEL_CREATE),
    zValidator("json", CreatePanelSchema),
    async (c) => {
      const input = c.req.valid("json");

      const domainInput = transformApiPanelToDomain(input);

      try {
        const panel = await Panel.create(domainInput);
        return c.json(panel, 201);
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
    }
  )

  .put(
    "/:id",
    ...compositions.authenticated,
    zValidator(
      "param",
      z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      })
    ),
    zValidator("json", UpdatePanelApiSchema),
    requirePermission(PermissionFlags.PANEL_EDIT),
    async (c) => {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        await Panel.getById(id);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Panel");
        }
        throw error;
      }

      const updateData = transformUpdateData(input);

      try {
        const panel = await Panel.update(id, updateData);
        return c.json(panel);
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
    }
  )

  .delete(
    "/:id",
    ...compositions.authenticated,
    zValidator(
      "param",
      z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      })
    ),
    requirePermission(PermissionFlags.PANEL_DELETE),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        const result = await Panel.remove(id);
        return c.json(result);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Panel");
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
    "/:id/deploy",
    ...compositions.authenticated,
    zValidator(
      "param",
      z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      })
    ),
    requirePermission(PermissionFlags.PANEL_DEPLOY),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        const panelData = await Panel.deploy(id);

        const result = await Discord.deployPanel(panelData);

        return c.json({
          success: true,
          messageId: result.messageId,
          channelId: result.channelId,
        });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Panel");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
          }
        }
        throw error;
      }
    }
  )

  .put(
    "/:id/redeploy",
    ...compositions.authenticated,
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
    requirePermission(PermissionFlags.PANEL_DEPLOY),
    async (c) => {
      const { id } = c.req.valid("param");
      const { messageId } = c.req.valid("json");

      try {
        const panelData = await Panel.deploy(id);

        const result = await Discord.updatePanel(panelData, messageId);

        return c.json({
          success: true,
          messageId: result.messageId,
          channelId: result.channelId,
        });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Panel");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
          }
        }
        throw error;
      }
    }
  );
