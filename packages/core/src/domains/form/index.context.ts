import { prisma } from "../../prisma/client";
import { Actor, withTransaction, afterTransaction, VisibleError } from "../../context";
import { PermissionFlags } from "../../schemas/permissions-constants";
import type {
  Form as PrismaForm,
  FormField,
  Panel as PrismaPanel,
  FormFieldType,
} from "@prisma/client";

type FormWithFields = PrismaForm & {
  formFields: FormField[];
};

type FormWithFieldsAndPanels = FormWithFields & {
  panels: PrismaPanel[];
};

type FormWithCount = PrismaForm & {
  formFields: FormField[];
  _count?: { panels: number };
  panels?: { id: number; title: string }[];
};

// Type for the formatted API response
type FormattedForm = ReturnType<typeof formatFormForAPI>;

/**
 * Context-aware Form domain methods
 * These methods automatically use actor context for permissions and guild context
 */
export namespace Form {
  /**
   * List forms for the current guild
   * Forms are typically managed through panels, but this provides direct access
   */
  export const list = async (): Promise<FormattedForm[]> => {
    const guildId = Actor.guildId();

    const forms = await prisma.form.findMany({
      where: { guildId },
      include: {
        formFields: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { panels: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return forms.map(formatFormForAPI);
  };

  /**
   * Get a specific form by ID
   * Checks that the form belongs to the current guild
   */
  export const getById = async (formId: number): Promise<FormattedForm> => {
    const guildId = Actor.guildId();

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formFields: {
          orderBy: { orderIndex: "asc" },
        },
        panels: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!form) {
      throw new VisibleError("not_found", "Form not found");
    }

    if (form.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Form does not belong to this guild");
    }

    return formatFormForAPI(form);
  };

  /**
   * Create a new form
   * Requires PANEL_CREATE permission (forms are part of panels)
   */
  export const create = async (input: {
    name: string;
    description?: string;
    fields: Array<{
      type: FormFieldType;
      label: string;
      placeholder?: string;
      required?: boolean;
      validationRules?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
      };
      options?: string[]; // For select/multi_select
    }>;
  }): Promise<FormattedForm> => {
    Actor.requirePermission(PermissionFlags.PANEL_CREATE);
    const guildId = Actor.guildId();

    return withTransaction(async () => {
      // Create form
      const form = await prisma.form.create({
        data: {
          name: input.name,
          guildId,
        },
      });

      // Create form fields
      if (input.fields.length > 0) {
        await prisma.formField.createMany({
          data: input.fields.map((field, index) => ({
            formId: form.id,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder || "",
            required: field.required ?? true,
            orderIndex: index,
            validationRules: field.validationRules ? JSON.stringify(field.validationRules) : null,
            options: field.options ? JSON.stringify(field.options) : null,
          })),
        });
      }

      // Fetch the complete form with fields
      const completeForm = await prisma.form.findUnique({
        where: { id: form.id },
        include: {
          formFields: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      afterTransaction(async () => {
        console.log(`Form ${form.id} created in guild ${guildId}`);
      });

      return formatFormForAPI(completeForm!);
    });
  };

  /**
   * Update an existing form
   * Requires PANEL_EDIT permission
   */
  export const update = async (
    formId: number,
    input: {
      name?: string;
      description?: string;
      fields?: Array<{
        id?: number; // If provided, update existing field
        type: FormFieldType;
        label: string;
        placeholder?: string;
        required?: boolean;
        validationRules?: {
          minLength?: number;
          maxLength?: number;
          pattern?: string;
        };
        options?: string[];
      }>;
    }
  ): Promise<FormattedForm> => {
    Actor.requirePermission(PermissionFlags.PANEL_EDIT);
    const guildId = Actor.guildId();

    // Verify form belongs to this guild
    const existingForm = await prisma.form.findUnique({
      where: { id: formId },
      select: { guildId: true },
    });

    if (!existingForm) {
      throw new VisibleError("not_found", "Form not found");
    }

    if (existingForm.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Form does not belong to this guild");
    }

    return withTransaction(async () => {
      // Update form metadata
      if (input.name) {
        await prisma.form.update({
          where: { id: formId },
          data: { name: input.name },
        });
      }

      // Update fields if provided
      if (input.fields) {
        // Delete all existing fields
        await prisma.formField.deleteMany({
          where: { formId },
        });

        // Create new fields
        await prisma.formField.createMany({
          data: input.fields.map((field, index) => ({
            formId,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder || "",
            required: field.required ?? true,
            orderIndex: index,
            validationRules: field.validationRules ? JSON.stringify(field.validationRules) : null,
            options: field.options ? JSON.stringify(field.options) : null,
          })),
        });
      }

      // Fetch updated form
      const updatedForm = await prisma.form.findUnique({
        where: { id: formId },
        include: {
          formFields: {
            orderBy: { orderIndex: "asc" },
          },
          panels: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      afterTransaction(async () => {
        console.log(`Form ${formId} updated`);
      });

      return formatFormForAPI(updatedForm!);
    });
  };

  /**
   * Delete a form
   * Requires PANEL_DELETE permission
   * Note: This will fail if the form is still attached to panels
   */
  export const remove = async (
    formId: number
  ): Promise<{ success: boolean; deletedId: number }> => {
    Actor.requirePermission(PermissionFlags.PANEL_DELETE);
    const guildId = Actor.guildId();

    // Verify form belongs to this guild
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        guildId: true,
        _count: {
          select: { panels: true },
        },
      },
    });

    if (!form) {
      throw new VisibleError("not_found", "Form not found");
    }

    if (form.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Form does not belong to this guild");
    }

    if (form._count.panels > 0) {
      throw new VisibleError(
        "conflict",
        `Form is still attached to ${form._count.panels} panel(s). Remove from panels first.`
      );
    }

    return withTransaction(async () => {
      // Delete form fields first (cascade)
      await prisma.formField.deleteMany({
        where: { formId },
      });

      // Delete form
      const deleted = await prisma.form.delete({
        where: { id: formId },
      });

      afterTransaction(async () => {
        console.log(`Form ${formId} deleted`);
      });

      return { success: true, deletedId: deleted.id };
    });
  };

  /**
   * Duplicate a form
   * Creates a copy of an existing form with a new name
   */
  export const duplicate = async (formId: number, newName: string): Promise<FormattedForm> => {
    Actor.requirePermission(PermissionFlags.PANEL_CREATE);
    const guildId = Actor.guildId();

    // Get original form
    const original = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formFields: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!original) {
      throw new VisibleError("not_found", "Form not found");
    }

    if (original.guildId !== guildId) {
      throw new VisibleError("permission_denied", "Form does not belong to this guild");
    }

    return withTransaction(async () => {
      // Create new form
      const newForm = await prisma.form.create({
        data: {
          name: newName,
          guildId,
        },
      });

      // Copy fields
      if (original.formFields.length > 0) {
        await prisma.formField.createMany({
          data: original.formFields.map((field) => ({
            formId: newForm.id,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder,
            required: field.required,
            orderIndex: field.orderIndex,
            validationRules: field.validationRules as string | null,
            options: field.options as string | null,
          })),
        });
      }

      // Fetch complete new form
      const completeForm = await prisma.form.findUnique({
        where: { id: newForm.id },
        include: {
          formFields: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      afterTransaction(async () => {
        console.log(`Form ${formId} duplicated as ${newForm.id}`);
      });

      return formatFormForAPI(completeForm!);
    });
  };
}

// Helper functions

function formatFormForAPI(form: FormWithCount | FormWithFieldsAndPanels) {
  const panelCount =
    "_count" in form && form._count ? form._count.panels : form.panels?.length || 0;

  const panels =
    form.panels?.map((p: any) => ({
      id: p.id,
      title: p.title,
    })) || [];

  return {
    id: form.id,
    name: form.name,
    guildId: form.guildId,
    fields:
      form.formFields?.map((field) => ({
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        required: field.required,
        orderIndex: field.orderIndex,
        validationRules: field.validationRules,
        options: field.options,
      })) || [],
    metadata: {
      panelCount,
      panels,
      createdAt: form.createdAt.toISOString(),
    },
  };
}
