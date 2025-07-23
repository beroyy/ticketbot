import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  DiscordUserIdSchema,
  CreatePanelSchema,
  UpdatePanelSchema,
  CreateFormSchema,
  UpdateFormSchema,
  TicketStatusSchema,
} from "@ticketsbot/core";
import { globalRegistry } from "../utils/validation";
import { SchemaNameSchema } from "../utils/validation-schemas";

// Register core schemas with metadata
globalRegistry.add(DiscordGuildIdSchema, {
  title: "Discord Guild ID",
  description: "A Discord server (guild) snowflake ID",
  examples: ["123456789012345678"],
});

globalRegistry.add(DiscordChannelIdSchema, {
  title: "Discord Channel ID",
  description: "A Discord channel snowflake ID",
  examples: ["987654321098765432"],
});

globalRegistry.add(DiscordUserIdSchema, {
  title: "Discord User ID",
  description: "A Discord user snowflake ID",
  examples: ["111111111111111111"],
});

globalRegistry.add(TicketStatusSchema, {
  title: "Ticket Status",
  description: "Valid ticket status values",
  examples: ["OPEN", "CLAIMED", "CLOSED", "PENDING"],
});

// Schema documentation endpoint
export const schemas = new Hono();

// GET /schemas - List all available schemas
schemas.get("/", async (c) => {
  // Generate JSON Schema for registered schemas
  const jsonSchemas: Record<string, any> = {};

  // Core schemas
  jsonSchemas["DiscordGuildId"] = z.toJSONSchema(DiscordGuildIdSchema);
  jsonSchemas["DiscordChannelId"] = z.toJSONSchema(DiscordChannelIdSchema);
  jsonSchemas["DiscordUserId"] = z.toJSONSchema(DiscordUserIdSchema);
  jsonSchemas["TicketStatus"] = z.toJSONSchema(TicketStatusSchema);

  // Panel schemas
  jsonSchemas["CreatePanel"] = z.toJSONSchema(CreatePanelSchema);
  jsonSchemas["UpdatePanel"] = z.toJSONSchema(UpdatePanelSchema);

  // Form schemas
  jsonSchemas["CreateForm"] = z.toJSONSchema(CreateFormSchema);
  jsonSchemas["UpdateForm"] = z.toJSONSchema(UpdateFormSchema);

  return c.json({
    description: "TicketsBot API JSON Schema definitions",
    version: "1.0.0",
    schemas: jsonSchemas,
    info: {
      note: "These schemas represent the validation rules for API requests and responses",
      documentation: "https://docs.ticketsbot.net/api/schemas",
    },
  });
});

// GET /schemas/:name - Get a specific schema
schemas.get(
  "/:name",
  zValidator("param", z.object({ name: SchemaNameSchema })),
  async (c) => {
    const { name } = c.req.valid("param");

    // Map of available schemas
    const schemaMap: Record<string, z.ZodType<any>> = {
      "discord-guild-id": DiscordGuildIdSchema,
      "discord-channel-id": DiscordChannelIdSchema,
      "discord-user-id": DiscordUserIdSchema,
      "ticket-status": TicketStatusSchema,
      "create-panel": CreatePanelSchema,
      "update-panel": UpdatePanelSchema,
      "create-form": CreateFormSchema,
      "update-form": UpdateFormSchema,
    };

    const schema = schemaMap[name];
    if (!schema) {
      return c.json({ error: "Schema not found" }, 404);
    }

    const jsonSchema = z.toJSONSchema(schema);

    return c.json({
      name,
      schema: jsonSchema,
      examples: getExamplesForSchema(name),
    });
  }
);

// Helper to provide examples for schemas
function getExamplesForSchema(name: string): any[] {
  const examples: Record<string, any[]> = {
    "discord-guild-id": ["123456789012345678"],
    "discord-channel-id": ["987654321098765432"],
    "discord-user-id": ["111111111111111111"],
    "ticket-status": ["OPEN", "CLAIMED", "CLOSED", "PENDING"],
    "create-panel": [
      {
        type: "SINGLE",
        title: "Support Panel",
        guildId: "123456789012345678",
        channelId: "987654321098765432",
        buttonText: "Create Ticket",
        color: "#5865F2",
      },
    ],
    "create-form": [
      {
        name: "Contact Form",
        description: "Please fill out this form",
        guild_id: "123456789012345678",
        fields: [
          {
            form_id: 1,
            label: "Your Name",
            field_type: "TEXT",
            validation_rules: { required: true },
            position: 0,
          },
        ],
      },
    ],
  };

  return examples[name.toLowerCase()] || [];
}
