import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Form } from "@ticketsbot/core/domains";
import { createRoute } from "../../factory";
import { ApiErrors } from "../../utils/error-handler";
import { compositions } from "../../middleware/context";
import {
  CreateFormSchema,
  UpdateFormSchema,
  DuplicateFormSchema,
  transformFieldsToDomain,
} from "./schemas";

export const formRoutes = createRoute()
  .get("/", ...compositions.guildScoped, async (c) => {
    const forms = await Form.list();
    return c.json(forms);
  })

  .get(
    "/:id",
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        const form = await Form.getById(id);
        return c.json(form);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Form");
        }
        throw error;
      }
    }
  )

  .post("/", ...compositions.guildScoped, zValidator("json", CreateFormSchema), async (c) => {
    const input = c.req.valid("json");

    const formData = {
      name: input.name,
      description: input.description === null ? undefined : input.description,
      fields: transformFieldsToDomain(input.fields),
    };

    try {
      const form = await Form.create(formData as any);
      return c.json(form, 201);
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
  })

  .put(
    "/:id",
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    zValidator("json", UpdateFormSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        await Form.getById(id);

        if (input.name || input.description !== undefined) {
          const updateData: any = {};
          if (input.name) updateData.name = input.name;
          if (input.description !== undefined) updateData.description = input.description;
          await Form.update(id, updateData);
        }

        // TODO: Field updates require more complex logic
        if (input.fields) {
          // Would need to compare existing fields, update/add/remove as needed
        }

        const form = await Form.getById(id);
        return c.json(form);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Form");
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
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        const result = await Form.remove(id);
        return c.json(result);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Form");
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
    "/:id/duplicate",
    ...compositions.guildScoped,
    zValidator(
      "param",
      z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      })
    ),
    zValidator("json", DuplicateFormSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name } = c.req.valid("json");

      try {
        const form = await Form.duplicate(id, name);
        return c.json(form, 201);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "not_found") {
            throw ApiErrors.notFound("Form");
          }
          if (error.code === "permission_denied") {
            throw ApiErrors.forbidden(String((error as any).message || "Permission denied"));
          }
          if (error.code === "conflict") {
            throw ApiErrors.conflict(String((error as any).message || "Form name already exists"));
          }
        }
        throw error;
      }
    }
  );
