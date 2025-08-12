import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "@ticketsbot/db";
import { Discord } from "@ticketsbot/core/discord";
import { PermissionFlags } from "@ticketsbot/core";
import { createRoute } from "../../factory";
import { ApiErrors } from "../../utils/error-handler";
import { compositions, requirePermission } from "../../middleware/context";
import {
  CreatePanelSchema,
  UpdatePanelApiSchema,
  transformApiPanelToDomain,
  transformUpdateData,
} from "./schemas";

export const panelRoutes = createRoute()
  .get("/", ...compositions.guildScoped, async (c) => {
    const guildId = c.get("guildId");
    if (!guildId) {
      throw ApiErrors.badRequest("Guild ID is required");
    }
    const panels = await db.panel.list(guildId);
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
        const panel = await db.panel.getById(id);
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
        const panel = await db.panel.create(domainInput);
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
        await db.panel.getById(id);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Panel");
        }
        throw error;
      }

      const updateData = transformUpdateData(input);

      try {
        const panel = await db.panel.update(id, updateData);
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
        const result = await db.panel.remove(id);
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
        const panelData = await db.panel.deploy(id);

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
        const panelData = await db.panel.deploy(id);

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
