import {
  prisma,
  Prisma,
  type Panel as PrismaPanel,
  type Form as PrismaForm,
  type FormField,
} from "@ticketsbot/db";
import { Actor, VisibleError } from "../../context";
import { PermissionFlags } from "../../permissions/constants";
import { parseDiscordIdV4 as parseDiscordId } from "../../utils/discord-id";

// Type for Panel with its form included
type PanelWithForm = PrismaPanel & {
  form:
    | (PrismaForm & {
        formFields: FormField[];
      })
    | null;
};

// Export schemas
export {
  PanelTypeSchema,
  CreatePanelSchema,
  UpdatePanelSchema,
  PanelQuerySchema,
  type PanelType,
  type CreatePanelInput,
  type UpdatePanelInput,
  type PanelQuery,
} from "./schemas";

/**
 * Context-aware Panel domain methods
 * These methods automatically use actor context for permissions and guild context
 */
export namespace Panel {
  // Re-export Prisma type for domain consumers
  export type Base = PrismaPanel;
  export type WithForm = PanelWithForm;

  /**
   * List panels for the current guild
   * Requires actor context with guildId
   */
  export const list = async (): Promise<FormattedPanel[]> => {
    const guildId = Actor.guildId();

    const panels = await prisma.panel.findMany({
      where: { guildId },
      include: {
        form: {
          include: {
            formFields: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    return panels.map(formatPanelForAPI);
  };

  /**
   * List all panels including disabled ones
   * Useful for setup/configuration commands
   */
  export const listAll = async (options?: {
    orderBy?: "id" | "title";
    order?: "asc" | "desc";
  }): Promise<FormattedPanel[]> => {
    const guildId = Actor.guildId();
    const { orderBy = "id", order = "desc" } = options || {};

    const panels = await prisma.panel.findMany({
      where: { guildId },
      include: {
        form: {
          include: {
            formFields: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
      orderBy: { [orderBy]: order },
    });

    return panels.map(formatPanelForAPI);
  };

  /**
   * Get a specific panel by ID
   * Checks that the panel belongs to the current guild
   */
  export const getById = async (panelId: number): Promise<FormattedPanel> => {
    const guildId = Actor.guildId();

    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        form: {
          include: {
            formFields: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (!panel) {
      throw new VisibleError("not_found", "Panel not found");
    }

    if (panel.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Panel does not belong to this guild");
    }

    return formatPanelForAPI(panel);
  };

  /**
   * Get panel with form for internal use (not formatted for API)
   * Checks that the panel belongs to the current guild
   */
  export const getWithForm = async (panelId: number): Promise<PanelWithForm> => {
    const guildId = Actor.guildId();

    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        form: {
          include: {
            formFields: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (!panel) {
      throw new Error("Panel not found");
    }

    if (panel.guildId !== guildId) {
      throw new Error("Panel does not belong to this guild");
    }

    return panel;
  };

  /**
   * Create a new panel
   * Requires PANEL_CREATE permission
   */
  export const create = async (input: {
    type: "SINGLE" | "MULTI";
    channelId: string;
    welcomeMessage?: WelcomeMessage;
    singlePanel?: SinglePanelInput;
    multiPanel?: MultiPanelInput;
  }): Promise<FormattedPanel> => {
    Actor.requirePermission(PermissionFlags.PANEL_CREATE);
    const guildId = Actor.guildId();

    // Validate and clean channel ID
    const channelResult = parseDiscordId(input.channelId);
    if (!channelResult.success || !channelResult.data) {
      throw new VisibleError("validation_error", "Invalid channel ID format");
    }
    const channelId = channelResult.data;

    return prisma.$transaction(async (tx) => {
      if (input.type === "SINGLE") {
        if (!input.singlePanel) {
          throw new VisibleError("validation_error", "singlePanel is required for SINGLE type");
        }
        return createSinglePanel(guildId, channelId, input.singlePanel, input.welcomeMessage, { tx });
      } else {
        if (!input.multiPanel) {
          throw new VisibleError("validation_error", "multiPanel is required for MULTI type");
        }
        return createMultiPanel(guildId, channelId, input.multiPanel, input.welcomeMessage, { tx });
      }
    });
  };

  /**
   * Update an existing panel
   * Requires PANEL_EDIT permission
   */
  export const update = async (
    panelId: number,
    input: {
      channel?: string;
      title?: string;
      questions?: Question[];
      category?: string;
      emoji?: string;
      buttonText?: string;
      color?: string;
      welcomeMessage?: string;
      introTitle?: string;
      introDescription?: string;
      channelPrefix?: string;
    }
  ): Promise<FormattedPanel> => {
    Actor.requirePermission(PermissionFlags.PANEL_EDIT);
    const guildId = Actor.guildId();

    // Verify panel belongs to this guild
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      select: { guildId: true, formId: true },
    });

    if (!panel) {
      throw new VisibleError("not_found", "Panel not found");
    }

    if (panel.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Panel does not belong to this guild");
    }

    return prisma.$transaction(async (tx) => {
      // Update form if questions provided
      if (input.questions && panel.formId) {
        await updatePanelForm(panel.formId, input.questions, { tx });
      }

      // Parse channel ID if provided
      let channelId: string | undefined;
      if (input.channel) {
        const channelResult = parseDiscordId(input.channel);
        if (!channelResult.success) {
          throw new VisibleError("validation_error", "Invalid channel ID format");
        }
        channelId = channelResult.data;
      }

      // Parse category ID if provided
      let categoryId: string | null | undefined;
      if (input.category !== undefined) {
        const categoryResult = parseDiscordId(input.category);
        if (categoryResult.success) {
          categoryId = categoryResult.data;
        } else {
          categoryId = null;
        }
      }

      // Update panel
      const updated = await tx.panel.update({
        where: { id: panelId },
        data: {
          channelId: channelId || undefined,
          title: input.title,
          categoryId,
          emoji: input.emoji,
          buttonText: input.buttonText,
          color: input.color,
          welcomeMessage: input.welcomeMessage,
          introTitle: input.introTitle,
          introDescription: input.introDescription,
          channelPrefix: input.channelPrefix,
        },
        include: {
          form: {
            include: {
              formFields: {
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
      });

      // Event logging removed - TCN will handle this automatically
      // Re-deployment needed if channel changed
      if (channelId && updated.messageId) {
        // Panel will need re-deployment
      }

      return formatPanelForAPI(updated);
    });
  };

  /**
   * Delete a panel
   * Requires PANEL_DELETE permission
   */
  export const remove = async (
    panelId: number
  ): Promise<{ success: boolean; deletedId: number }> => {
    Actor.requirePermission(PermissionFlags.PANEL_DELETE);
    const guildId = Actor.guildId();

    // Verify panel belongs to this guild
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      select: { guildId: true, messageId: true, channelId: true },
    });

    if (!panel) {
      throw new VisibleError("not_found", "Panel not found");
    }

    if (panel.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Panel does not belong to this guild");
    }

    return prisma.$transaction(async (tx) => {
      const deleted = await tx.panel.delete({
        where: { id: panelId },
      });

      // Event logging removed - TCN will handle this automatically
      // Discord message will need deletion if deployed
      if (panel.messageId) {
        // Panel message will need removal from Discord
      }

      return { success: true, deletedId: deleted.id };
    });
  };

  /**
   * Deploy a panel to Discord
   * Requires PANEL_DEPLOY permission
   */
  export const deploy = async (
    panelId: number
  ): Promise<ReturnType<typeof formatPanelForDeployment>> => {
    Actor.requirePermission(PermissionFlags.PANEL_DEPLOY);
    const guildId = Actor.guildId();

    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        form: {
          include: {
            formFields: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (!panel) {
      throw new VisibleError("not_found", "Panel not found");
    }

    if (panel.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Panel does not belong to this guild");
    }

    // This will be called by the API route which has access to Discord service
    return formatPanelForDeployment(panel);
  };
}

// Helper functions

interface WelcomeMessage {
  title?: string;
  content?: string;
  fields?: Array<{ name: string; value: string }>;
}

interface Question {
  id: string;
  type: "SHORT_TEXT" | "PARAGRAPH";
  label: string;
  placeholder: string;
  enabled: boolean;
  characterLimit?: number;
}

interface SinglePanelInput {
  title: string;
  emoji?: string;
  buttonText?: string;
  buttonColor?: string;
  categoryId?: string;
  questions?: Question[];
  mentionOnOpen?: string;
  hideMentions?: boolean;
  textSections?: Array<{ name: string; value: string }>;
}

interface MultiPanelInput {
  title: string;
  description?: string;
  selectMenuTitle: string;
  selectMenuPlaceholder?: string;
  panels: Array<{
    title: string;
    description?: string;
    emoji?: string;
    categoryId?: string;
    introTitle?: string;
    introDescription?: string;
    channelPrefix?: string;
    mentionOnOpen?: string[];
    hideMentions?: boolean;
    questions?: Question[];
  }>;
}

async function createSinglePanel(
  guildId: string,
  channelId: string,
  input: SinglePanelInput,
  welcomeMessage?: WelcomeMessage,
  options?: { tx?: any }
) {
  const client = options?.tx || prisma;
  
  // Create form if questions provided
  let formId: number | undefined;
  if (input.questions && input.questions.length > 0) {
    const form = await client.form.create({
      data: {
        name: `${input.title} Form`,
        guildId,
      },
    });

    // Create form fields
    await client.formField.createMany({
      data: input.questions
        .filter((q) => q.enabled)
        .map((q, index) => ({
          formId: form.id,
          type: q.type,
          label: q.label,
          placeholder: q.placeholder || "",
          required: true,
          orderIndex: index,
          validationRules: q.characterLimit
            ? JSON.stringify({ maxLength: q.characterLimit })
            : null,
        })),
    });

    formId = form.id;
  }

  // Parse category ID
  let categoryId: string | null = null;
  if (input.categoryId) {
    const categoryResult = parseDiscordId(input.categoryId);
    if (categoryResult.success && categoryResult.data) {
      categoryId = categoryResult.data;
    }
  }

  // Create panel
  const panel = await client.panel.create({
    data: {
      type: "SINGLE",
      title: input.title,
      guildId,
      channelId,
      buttonText: input.buttonText || "Open Ticket",
      categoryId,
      formId,
      emoji: input.emoji,
      color: input.buttonColor,
      welcomeMessage: welcomeMessage ? JSON.stringify(welcomeMessage) : null,
      mentionRoles: input.mentionOnOpen ? JSON.stringify([input.mentionOnOpen]) : null,
      hideMentions: input.hideMentions || false,
      textSections: input.textSections ? JSON.stringify(input.textSections) : Prisma.JsonNull,
      enabled: true,
    },
    include: {
      form: {
        include: {
          formFields: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  // Event logging removed - TCN will handle this automatically

  return formatPanelForAPI(panel);
}

async function createMultiPanel(
  guildId: string,
  channelId: string,
  input: MultiPanelInput,
  welcomeMessage?: WelcomeMessage,
  options?: { tx?: any }
) {
  const client = options?.tx || prisma;
  
  // Create parent panel
  const parentPanel = await client.panel.create({
    data: {
      type: "MULTI",
      title: input.title,
      content: input.description,
      guildId,
      channelId,
      buttonText: input.selectMenuTitle,
      welcomeMessage: welcomeMessage ? JSON.stringify(welcomeMessage) : null,
      enabled: true,
    },
  });

  // Create child panels
  await Promise.all(
    input.panels.map(async (childInput, index) => {
      // Create form if needed
      let formId: number | undefined;
      if (childInput.questions && childInput.questions.length > 0) {
        const form = await client.form.create({
          data: {
            name: `${childInput.title} Form`,
            guildId,
          },
        });

        await client.formField.createMany({
          data: childInput.questions
            .filter((q) => q.enabled)
            .map((q, idx) => ({
              formId: form.id,
              type: q.type,
              label: q.label,
              placeholder: q.placeholder || "",
              required: true,
              orderIndex: idx,
            })),
        });

        formId = form.id;
      }

      // Parse category ID
      let categoryId: string | null = null;
      if (childInput.categoryId) {
        const categoryResult = parseDiscordId(childInput.categoryId);
        if (categoryResult.success && categoryResult.data) {
          categoryId = categoryResult.data;
        }
      }

      return client.panel.create({
        data: {
          type: "SINGLE",
          title: childInput.title,
          content: childInput.description,
          guildId,
          channelId,
          buttonText: childInput.title,
          categoryId,
          formId,
          emoji: childInput.emoji,
          introTitle: childInput.introTitle,
          introDescription: childInput.introDescription,
          channelPrefix: childInput.channelPrefix,
          mentionRoles: childInput.mentionOnOpen ? JSON.stringify(childInput.mentionOnOpen) : null,
          hideMentions: childInput.hideMentions || false,
          parentPanelId: parentPanel.id,
          orderIndex: index,
          enabled: true,
        },
      });
    })
  );

  // Event logging removed - TCN will handle this automatically

  // Fetch the panel with form included
  const panelWithForm = await prisma.panel.findUniqueOrThrow({
    where: { id: parentPanel.id },
    include: {
      form: {
        include: {
          formFields: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  return formatPanelForAPI(panelWithForm);
}

async function updatePanelForm(formId: number, questions: Question[], options?: { tx?: any }) {
  const db = options?.tx || prisma;
  
  // Delete existing fields
  await db.formField.deleteMany({
    where: { formId },
  });

  // Create new fields
  await db.formField.createMany({
    data: questions
      .filter((q) => q.enabled)
      .map((q, index) => ({
        formId,
        type: q.type,
        label: q.label,
        placeholder: q.placeholder || "",
        required: true,
        orderIndex: index,
        validationRules: q.characterLimit ? JSON.stringify({ maxLength: q.characterLimit }) : null,
      })),
  });
}

type PanelWithFormAndFields = PrismaPanel & {
  form: (PrismaForm & { formFields: FormField[] }) | null;
};

// Type for the formatted API response
type FormattedPanel = ReturnType<typeof formatPanelForAPI>;

function formatPanelForAPI(panel: PanelWithFormAndFields) {
  return {
    id: panel.id.toString(),
    channel: `# | ${panel.channelId}`,
    title: panel.title,
    guildId: panel.guildId.toString(),
    type: panel.type,
    content: panel.content,
    channelId: panel.channelId.toString(),
    categoryId: panel.categoryId?.toString(),
    formId: panel.formId,
    emoji: panel.emoji,
    buttonText: panel.buttonText,
    color: panel.color,
    welcomeMessage: panel.welcomeMessage,
    introTitle: panel.introTitle,
    introDescription: panel.introDescription,
    channelPrefix: panel.channelPrefix,
    mentionRoles: panel.mentionRoles,
    hideMentions: panel.hideMentions,
    parentPanelId: panel.parentPanelId,
    orderIndex: panel.orderIndex,
    enabled: panel.enabled,
    permissions: panel.permissions,
    messageId: panel.messageId?.toString(),
    deployedAt: panel.deployedAt?.toISOString(),
    textSections: panel.textSections || undefined,
    form: panel.form
      ? {
          id: panel.form.id,
          title: panel.form.name,
          description: undefined,
          guildId: panel.form.guildId.toString(),
          fields:
            panel.form.formFields?.map((field) => ({
              id: field.id,
              formId: field.formId,
              type: field.type,
              label: field.label,
              placeholder: field.placeholder,
              required: field.required,
              orderIndex: field.orderIndex,
              validationRules: field.validationRules,
              options: field.options,
            })) || [],
        }
      : undefined,
  };
}

function formatPanelForDeployment(panel: PanelWithFormAndFields) {
  return {
    id: panel.id,
    type: panel.type,
    title: panel.title,
    content: panel.content,
    guildId: panel.guildId,
    channelId: panel.channelId,
    emoji: panel.emoji,
    buttonText: panel.buttonText,
    color: panel.color,
    introTitle: panel.introTitle,
    introDescription: panel.introDescription,
    imageUrl: panel.imageUrl,
    thumbnailUrl: panel.thumbnailUrl,
    textSections: panel.textSections,
    mentionRoles: panel.mentionRoles,
    form: panel.form,
  };
}
