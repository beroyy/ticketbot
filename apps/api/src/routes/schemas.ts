import { z } from "zod";
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
import { createRoute } from "../factory";
import { ApiErrors } from "../utils/error-handler";
import { compositions } from "../middleware/context";

const schemaMap = {
  "discord-guild-id": DiscordGuildIdSchema,
  "discord-channel-id": DiscordChannelIdSchema,
  "discord-user-id": DiscordUserIdSchema,
  "ticket-status": TicketStatusSchema,
  "create-panel": CreatePanelSchema,
  "update-panel": UpdatePanelSchema,
  "create-form": CreateFormSchema,
  "update-form": UpdateFormSchema,
} as const;

const schemaExamples: Record<string, any[]> = {
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

interface SchemaListResponse {
  description: string;
  version: string;
  schemas: Record<string, any>;
  info: {
    note: string;
    documentation: string;
  };
}

interface _SchemaDetailResponse {
  name: string;
  schema: any;
  examples: any[];
}

export const schemaRoutes = createRoute()
  .get("/", ...compositions.public, async (c) => {
    const jsonSchemas: Record<string, any> = {};

    jsonSchemas["DiscordGuildId"] = z.toJSONSchema(DiscordGuildIdSchema);
    jsonSchemas["DiscordChannelId"] = z.toJSONSchema(DiscordChannelIdSchema);
    jsonSchemas["DiscordUserId"] = z.toJSONSchema(DiscordUserIdSchema);
    jsonSchemas["TicketStatus"] = z.toJSONSchema(TicketStatusSchema);

    jsonSchemas["CreatePanel"] = z.toJSONSchema(CreatePanelSchema);
    jsonSchemas["UpdatePanel"] = z.toJSONSchema(UpdatePanelSchema);

    jsonSchemas["CreateForm"] = z.toJSONSchema(CreateFormSchema);
    jsonSchemas["UpdateForm"] = z.toJSONSchema(UpdateFormSchema);

    const response: SchemaListResponse = {
      description: "TicketsBot API JSON Schema definitions",
      version: "1.0.0",
      schemas: jsonSchemas,
      info: {
        note: "These schemas represent the validation rules for API requests and responses",
        documentation: "https://docs.ticketsbot.net/api/schemas",
      },
    };

    return c.json(response);
  })

  .get("/:name<[a-z0-9-]+>", ...compositions.public, async (c) => {
    const name = c.req.param("name") as string;

    const schema = schemaMap[name as keyof typeof schemaMap];
    if (!schema) {
      throw ApiErrors.notFound("Schema");
    }

    const jsonSchema = z.toJSONSchema(schema);

    const response = {
      name: name as string,
      schema: jsonSchema,
      examples: schemaExamples[name as keyof typeof schemaExamples] || [],
    };

    return c.json(response);
  });
