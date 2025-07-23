import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { CreateGuildSchema } from "@ticketsbot/core/domains/guild";
import { CreatePanelSchema } from "@ticketsbot/core/domains/panel";
import { CreateTicketSchema } from "@ticketsbot/core/domains/ticket-lifecycle";
import { CreateTeamRoleSchema } from "@ticketsbot/core/domains/team";

/**
 * Example routes demonstrating Hono + Zod validation patterns
 */
export const example: Hono = new Hono();

// Example 1: Query parameter validation
example.get(
  "/guilds",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      ownerId: DiscordGuildIdSchema.optional(),
    })
  ),
  (c) => {
    const { page, limit, ownerId } = c.req.valid("query");

    // TypeScript knows these are validated:
    // page: number (at least 1)
    // limit: number (1-100)
    // ownerId: string | undefined (valid Discord ID if provided)

    return c.json({
      page,
      limit,
      ownerId,
      message: "Query parameters are validated!",
    });
  }
);

// Example 2: Path parameter validation
example.get(
  "/guilds/:guildId",
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  (c) => {
    const { guildId } = c.req.valid("param");

    // guildId is guaranteed to be a valid Discord snowflake
    return c.json({
      guildId,
      message: "Guild ID is validated!",
    });
  }
);

// Example 3: JSON body validation with database schema
example.post("/guilds", zValidator("json", CreateGuildSchema), (c) => {
  const data = c.req.valid("json");

  // data matches CreateGuildSchema exactly
  // TypeScript knows all the field types
  return c.json({
    created: data,
    message: "Guild data is validated!",
  });
});

// Example 4: Complex nested validation
example.post(
  "/panels",
  zValidator(
    "json",
    CreatePanelSchema.extend({
      // Add API-specific fields
      deployImmediately: z.boolean().default(false),
      notifyChannel: DiscordGuildIdSchema.optional(),
    })
  ),
  (c) => {
    const data = c.req.valid("json");

    // All panel fields are validated plus our custom fields
    return c.json({
      panel: data,
      willDeploy: data.deployImmediately,
    });
  }
);

// Example 5: Custom error handling
example.post(
  "/tickets",
  zValidator("json", CreateTicketSchema, (result, c) => {
    if (!result.success) {
      // Custom error response format
      return c.json(
        {
          error: "Validation failed",
          issues: result.error.issues.map((issue: any) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        400
      );
    }
    // Return undefined to continue with normal flow
    return undefined;
  }),
  (c) => {
    const data = c.req.valid("json");

    return c.json({
      ticket: data,
      message: "Ticket created successfully!",
    });
  }
);

// Example 6: Combining multiple validators
example.put(
  "/guilds/:guildId/roles",
  zValidator(
    "param",
    z.object({
      guildId: DiscordGuildIdSchema,
    })
  ),
  zValidator("json", CreateTeamRoleSchema),
  (c) => {
    const { guildId } = c.req.valid("param");
    const roleData = c.req.valid("json");

    // Both path params and body are validated
    return c.json({
      guildId,
      role: roleData,
      message: "Role created for guild!",
    });
  }
);

// Example 7: Optional fields and transforms
example.patch(
  "/settings",
  zValidator(
    "json",
    z.object({
      theme: z.enum(["light", "dark"]).optional(),
      language: z.string().min(2).max(5).optional(),
      notifications: z
        .object({
          email: z.boolean(),
          push: z.boolean(),
        })
        .optional(),
      // Transform comma-separated string to array
      tags: z
        .string()
        .transform((str) => str.split(",").map((s) => s.trim()))
        .pipe(z.array(z.string().min(1)))
        .optional(),
    })
  ),
  (c) => {
    const settings = c.req.valid("json");

    // settings.tags is string[] if provided
    return c.json({
      updated: settings,
      message: "Settings updated!",
    });
  }
);
