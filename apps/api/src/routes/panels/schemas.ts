import { z } from "zod";

export const PanelQuestionSchema = z
  .object({
    id: z.string().describe("Unique question ID"),
    type: z.enum(["SHORT_TEXT", "PARAGRAPH"]).describe("Question input type"),
    label: z.string().min(1).max(200).describe("Question label"),
    placeholder: z.string().max(100).optional().describe("Placeholder text"),
    enabled: z.boolean().default(true).describe("Whether question is enabled"),
    characterLimit: z.number().min(1).max(1000).optional().describe("Character limit for response"),
  })
  .refine((q) => q.label.trim().length > 0, { message: "Question label cannot be empty" });

export const TextSectionSchema = z.object({
  name: z.string().min(1).max(50).describe("Section identifier"),
  value: z.string().min(1).max(1000).describe("Section content"),
});

export const SinglePanelConfigSchema = z
  .object({
    title: z.string().min(1).max(100).describe("Panel title"),
    emoji: z.string().max(4).optional().describe("Button emoji"),
    buttonText: z.string().min(1).max(80).optional().default("Create Ticket"),
    buttonColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #5865F2)")
      .optional()
      .describe("Button color"),
    categoryId: z.string().optional().describe("Ticket category channel"),
    questions: z.array(PanelQuestionSchema).max(10).optional(),
    mentionOnOpen: z.string().optional().describe("Role to mention"),
    hideMentions: z.boolean().optional().default(false),
    ticketCategory: z.string().optional(),
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
        roles: z.array(z.string()).optional(),
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

export const MultiPanelOptionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  emoji: z.string().max(4).optional(),
  categoryId: z.string().optional(),
  introTitle: z.string().max(100).optional(),
  introDescription: z.string().max(500).optional(),
  channelPrefix: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Must be lowercase with hyphens only")
    .max(20)
    .optional(),
  mentionOnOpen: z.array(z.string()).optional(),
  hideMentions: z.boolean().optional().default(false),
  questions: z.array(PanelQuestionSchema).max(10).optional(),
});

export const MultiPanelConfigSchema = z
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

export const CreatePanelSchema = z
  .object({
    type: z.enum(["SINGLE", "MULTI"]).optional().default("SINGLE"),
    guildId: z.string(),
    channelId: z.string(),
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

export const UpdatePanelSchema = CreatePanelSchema.partial().extend({
  id: z.number().int(),
});

export const UpdatePanelApiSchema = UpdatePanelSchema.omit({ id: true }).extend({
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

export const transformApiPanelToDomain = (apiPanel: any) => {
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

export const transformUpdateData = (input: z.infer<typeof UpdatePanelApiSchema>) => {
  const updateData: Record<string, any> = {};

  // Handle top-level fields
  if (input.type !== undefined) updateData.type = input.type;
  if (input.guildId !== undefined) updateData.guildId = input.guildId;
  if (input.channelId !== undefined) updateData.channelId = input.channelId;
  if (input.channel !== undefined) updateData.channelId = input.channel;
  if (input.category !== undefined) updateData.categoryId = input.category;
  if (input.welcomeMessage !== undefined) updateData.welcomeMessage = input.welcomeMessage;
  if (input.questions !== undefined) updateData.questions = input.questions;

  // Handle single panel fields
  if (input.singlePanel) {
    const sp = input.singlePanel;
    if (sp.title !== undefined) updateData.title = sp.title;
    if (sp.emoji !== undefined) updateData.emoji = sp.emoji;
    if (sp.buttonText !== undefined) updateData.buttonText = sp.buttonText;
    if (sp.buttonColor !== undefined) updateData.color = sp.buttonColor;
    if (sp.categoryId !== undefined) updateData.categoryId = sp.categoryId;
    if (sp.questions !== undefined) updateData.questions = sp.questions;
    if (sp.mentionOnOpen !== undefined) updateData.mentionOnOpen = sp.mentionOnOpen;
    if (sp.hideMentions !== undefined) updateData.hideMentions = sp.hideMentions;
    if (sp.ticketCategory !== undefined) updateData.ticketCategory = sp.ticketCategory;
    if (sp.largeImageUrl !== undefined) updateData.largeImageUrl = sp.largeImageUrl;
    if (sp.smallImageUrl !== undefined) updateData.smallImageUrl = sp.smallImageUrl;
    if (sp.textSections !== undefined) updateData.textSections = sp.textSections;
    if (sp.accessControl !== undefined) updateData.accessControl = sp.accessControl;
  }

  // Handle multi panel fields
  if (input.multiPanel) {
    const mp = input.multiPanel;
    if (mp.title !== undefined) updateData.title = mp.title;
    if (mp.description !== undefined) updateData.content = mp.description;
    if (mp.selectMenuTitle !== undefined) updateData.introTitle = mp.selectMenuTitle;
    if (mp.selectMenuPlaceholder !== undefined) updateData.introDescription = mp.selectMenuPlaceholder;
    if (mp.panels !== undefined) updateData.panels = mp.panels;
  }

  return updateData;
};
